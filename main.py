"""
MULTI-AGENT PRODUCT ADVISOR (CrewAI + FastAPI, Tavily search, JSON output via Pydantic)
==========================================================================================
A Multi-Agent AI application built with CrewAI and Groq.
Products are found on the web using the Tavily search API.
Workflow:
    User Request -> Researcher Agent (searches the web via Tavily) ->
    Analyzer Agent (deterministic mathematical scoring) ->
    Recommender Agent -> final_recommendation.json

Run terminal mode:
    python main.py

Run API:
    uvicorn main:app --reload --host 127.0.0.1 --port 8000
"""

import os
import sys
import json
import time
import re
import logging
from typing import List, Optional, Any

# Configure UTF-8 for Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

import litellm

# Configure LiteLLM patch for Groq compatibility (strip unsupported cache_breakpoint and handle TPM rate limits)
orig_completion = litellm.completion

def robust_groq_completion(*args, **kwargs):
    if "messages" in kwargs and isinstance(kwargs["messages"], list):
        cleaned_messages = []
        for m in kwargs["messages"]:
            if isinstance(m, dict):
                cleaned_messages.append({k: v for k, v in m.items() if k != "cache_breakpoint"})
            else:
                cleaned_messages.append(m)
        kwargs["messages"] = cleaned_messages

    max_retries = 5
    for attempt in range(max_retries):
        try:
            return orig_completion(*args, **kwargs)
        except Exception as e:
            err_str = str(e)
            if "rate_limit" in err_str.lower() or "429" in err_str or "tpm" in err_str.lower():
                wait_time = 8.0
                match = re.search(r"try again in ([0-9.]+)s", err_str)
                if match:
                    wait_time = float(match.group(1)) + 1.0
                logging.warning(f"[RateLimit] Hit Groq TPM limit. Sleeping {wait_time:.1f}s before retry ({attempt+1}/{max_retries})...")
                time.sleep(wait_time)
            else:
                raise

    return orig_completion(*args, **kwargs)

litellm.completion = robust_groq_completion

from dotenv import load_dotenv
from pydantic import BaseModel, Field, field_validator
from pymongo import MongoClient
from tavily import TavilyClient
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from crewai import Agent, Task, Crew, Process, LLM
from crewai.tools import BaseTool


# ==========================================
# 2. CONFIGURATION
# ==========================================

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
GROQ_MODEL = os.getenv("GROQ_MODEL", "groq/qwen/qwen3.8-27b")

if not GROQ_API_KEY:
    raise ValueError(
        "GROQ_API_KEY is missing. Create a .env file and add: GROQ_API_KEY=your_key_here"
    )

if not TAVILY_API_KEY:
    raise ValueError(
        "TAVILY_API_KEY is missing. Create a .env file and add: TAVILY_API_KEY=your_key_here"
    )

os.environ["GROQ_API_KEY"] = GROQ_API_KEY

OUTPUT_DIR = "outputs"
os.makedirs(OUTPUT_DIR, exist_ok=True)

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


# ==========================================
# 3. DATABASE (MongoDB)
# ==========================================

client = None
searches_col = None

try:
    client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
    db = client["product_advisor"]
    searches_col = db["searches"]
    logger.info("MongoDB client initialized")
except Exception as e:
    logger.warning(f"MongoDB connection initialization note: {e}")


def save_search(user_request, final_answer_dict):
    """Saves a record of what the user asked and what the crew recommended."""
    if searches_col is not None:
        try:
            searches_col.insert_one({
                "user_request": user_request,
                "recommendation": final_answer_dict,
                "timestamp": time.time()
            })
            logger.info("Search logged in MongoDB")
        except Exception as e:
            logger.warning(f"Could not save search to MongoDB: {e}")


def get_previous_searches(limit=10):
    """Returns the most recent searches, newest first."""
    if searches_col is not None:
        try:
            return list(searches_col.find({}, {"_id": 0}).sort("_id", -1).limit(limit))
        except Exception as e:
            logger.warning(f"Could not fetch searches from MongoDB: {e}")
            return []
    return []


# ==========================================
# 4. PYDANTIC OUTPUT SCHEMAS
# ==========================================

class RecommendedProduct(BaseModel):
    name: str = Field(default="Unknown Product", description="Product name")
    price: float = Field(default=0.0, description="Price of the product, in user currency (0 if unknown)")
    cpu: str = Field(default="unknown", description="CPU / processor, or 'unknown' if not found")
    ram: int = Field(default=0, description="RAM in GB (0 if unknown)")
    battery_hours: int = Field(default=0, description="Battery life in hours (0 if unknown)")
    score: int = Field(default=0, description="Score calculated by the Score Products tool")
    reason: str = Field(default="", description="Short explanation of why this product is recommended")
    source_url: str = Field(default="", description="The web page this product info came from")

    @field_validator("price", mode="before")
    @classmethod
    def parse_price(cls, v: Any) -> float:
        if v is None:
            return 0.0
        try:
            return float(v)
        except (ValueError, TypeError):
            return 0.0

    @field_validator("ram", "battery_hours", "score", mode="before")
    @classmethod
    def parse_ints(cls, v: Any) -> int:
        if v is None:
            return 0
        try:
            return int(float(v))
        except (ValueError, TypeError):
            return 0

    @field_validator("cpu", "reason", "source_url", mode="before")
    @classmethod
    def parse_strings(cls, v: Any) -> str:
        if v is None:
            return ""
        return str(v)


class FinalRecommendation(BaseModel):
    user_request: str = Field(description="The original request written by the user")
    recommended_products: List[RecommendedProduct] = Field(
        description="The top recommended products, best first"
    )
    summary: str = Field(description="A short, friendly overall summary for the user")


# ==========================================
# 5. TOOLS
# ==========================================

tavily_client = TavilyClient(api_key=TAVILY_API_KEY)


class SearchProductsTool(BaseTool):
    name: str = "Search Products"
    description: str = (
        "Searches the real web (via Tavily) for products matching the query. "
        "Returns a JSON string with a list of results containing title, url, and content snippet."
    )

    def _run(self, query: str) -> str:
        logger.info(f"Running web search with query: {query}")
        try:
            response = tavily_client.search(
                query=query,
                search_depth="basic",
                max_results=4,
            )
            results = [
                {
                    "title": item.get("title", "")[:120],
                    "url": item.get("url", ""),
                    "content": item.get("content", "")[:250],
                }
                for item in response.get("results", [])
            ]
            return json.dumps(results, indent=2)
        except Exception as e:
            logger.error(f"Error during search: {e}")
            return json.dumps([{"title": "Search Error", "url": "", "content": str(e)}])


search_products_tool = SearchProductsTool()


def calculate_score(product: dict, requirements: dict) -> int:
    """Deterministic mathematical scoring rule."""
    score = 0
    try:
        budget = float(requirements.get("budget", 999999) or 999999)
    except (ValueError, TypeError):
        budget = 999999.0

    try:
        price = float(product.get("price", 0) or 0)
    except (ValueError, TypeError):
        price = 0.0

    if price > 0 and price <= budget:
        score += 30

    try:
        ram = int(product.get("ram", 0) or 0)
    except (ValueError, TypeError):
        ram = 0

    if ram >= 16:
        score += 20

    try:
        battery = int(product.get("battery_hours", 0) or 0)
    except (ValueError, TypeError):
        battery = 0

    if battery >= 8:
        score += 20

    use_case = str(requirements.get("use_case", "") or "").lower()
    prod_use_case = str(product.get("use_case", "") or "").lower()
    if use_case and use_case in prod_use_case:
        score += 30

    return score


class ScoreProductsTool(BaseTool):
    name: str = "Score Products"
    description: str = (
        "Takes a JSON string with requirements and candidate products, "
        "scores them deterministically with Python, and returns the sorted JSON array."
    )

    def _run(self, products_and_requirements_json: str) -> str:
        logger.info("Executing scoring tool...")
        raw = products_and_requirements_json
        if isinstance(raw, str):
            cleaned = raw.strip()
            if "```" in cleaned:
                m = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned)
                if m:
                    cleaned = m.group(1).strip()
            s = cleaned.find("{")
            e = cleaned.rfind("}")
            if s != -1 and e != -1:
                cleaned = cleaned[s:e+1]
            try:
                data = json.loads(cleaned)
            except Exception:
                data = {"requirements": {}, "products": []}
        else:
            data = raw if isinstance(raw, dict) else {"requirements": {}, "products": []}

        requirements = data.get("requirements", {})
        products = data.get("products", [])
        scored = [{**p, "score": calculate_score(p, requirements)} for p in products]
        scored.sort(key=lambda item: item.get("score", 0), reverse=True)
        return json.dumps(scored, indent=2)


score_products_tool = ScoreProductsTool()


def task_pause_callback(task_output):
    """Brief pause between tasks to help prevent hitting API rate limits."""
    time.sleep(2)


# ==========================================
# 6. AGENTS & WORKFLOW
# ==========================================

llm = LLM(model=GROQ_MODEL, api_key=GROQ_API_KEY)

researcher_agent = Agent(
    role="Senior Product Research Specialist",
    goal=(
        "Call Search Products tool ONCE with a well-targeted query. "
        "Extract products from the search snippets and return the final JSON object immediately."
    ),
    backstory=(
        "You are an expert product researcher skilled at finding real laptop specifications "
        "from e-commerce web search snippets accurately."
    ),
    tools=[search_products_tool],
    llm=llm,
    max_iter=2,
    verbose=True,
)

analyzer_agent = Agent(
    role="Quantitative Product Analyst",
    goal=(
        "Call Score Products tool once with the researcher's JSON input, "
        "and return the scored products JSON array."
    ),
    backstory="You are a data analyst who scores products accurately using deterministic tools.",
    tools=[score_products_tool],
    llm=llm,
    max_iter=2,
    verbose=True,
)

recommender_agent = Agent(
    role="Customer-Facing Recommendation Advisor",
    goal=(
        "From the scored products list, select the top 2-3 products and produce the final "
        "JSON output matching the FinalRecommendation schema."
    ),
    backstory="You are a trusted advisor providing clear, friendly shopping recommendations.",
    llm=llm,
    max_iter=1,
    verbose=True,
)


def build_crew(user_request: str) -> Crew:
    """Builds the Crew for a given user request."""

    research_task = Task(
        description=(
            f"The user's request is: '{user_request}'.\n"
            "1. Identify the use case (e.g. 'programming') and budget (e.g. 2500 DT).\n"
            "2. Execute ONE search using Search Products tool (e.g. 'pc portable 16go tunisie 2500 dt').\n"
            "3. Extract 2 to 4 products with fields: name, price (number or 0), cpu, ram (number or 0), battery_hours (number or 0), use_case, source_url.\n"
            "4. Return ONLY valid JSON in this exact shape:\n"
            '{"requirements": {"use_case": "...", "budget": 0.0}, "products": [...]}\n'
            "Do NOT run multiple searches."
        ),
        expected_output="A single valid JSON object with 'requirements' and 'products' keys.",
        agent=researcher_agent,
        output_file=os.path.join(OUTPUT_DIR, "1_research_result.md"),
        callback=task_pause_callback,
    )

    analysis_task = Task(
        description=(
            "Take the researcher's JSON output and pass it into Score Products tool. "
            "Return the resulting scored products JSON array immediately."
        ),
        expected_output="A JSON array of products with calculated 'score' fields.",
        agent=analyzer_agent,
        context=[research_task],
        output_file=os.path.join(OUTPUT_DIR, "2_analysis_result.md"),
        callback=task_pause_callback,
    )

    recommendation_task = Task(
        description=(
            f"The user's original request was: '{user_request}'.\n"
            "Review the scored products and select the top recommendations.\n"
            "Return ONLY raw JSON matching this shape:\n"
            "{\n"
            f'  "user_request": "{user_request}",\n'
            '  "recommended_products": [\n'
            '    {\n'
            '      "name": "...",\n'
            '      "price": 0.0,\n'
            '      "cpu": "...",\n'
            '      "ram": 16,\n'
            '      "battery_hours": 0,\n'
            '      "score": 0,\n'
            '      "reason": "...",\n'
            '      "source_url": "..."\n'
            '    }\n'
            '  ],\n'
            '  "summary": "..."\n'
            "}"
        ),
        expected_output="A single raw JSON object matching the FinalRecommendation schema.",
        agent=recommender_agent,
        context=[analysis_task],
    )

    return Crew(
        agents=[researcher_agent, analyzer_agent, recommender_agent],
        tasks=[research_task, analysis_task, recommendation_task],
        process=Process.sequential,
        verbose=True,
    )


def _parse_final_recommendation(raw_text: str, user_request: str) -> FinalRecommendation:
    """Parses raw agent output into a validated FinalRecommendation instance."""
    cleaned = raw_text.strip()

    if "```" in cleaned:
        m = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned)
        if m:
            cleaned = m.group(1).strip()

    s = cleaned.find("{")
    e = cleaned.rfind("}")
    if s != -1 and e != -1:
        cleaned = cleaned[s:e+1]

    try:
        parsed_dict = json.loads(cleaned)
        if "user_request" not in parsed_dict or not parsed_dict["user_request"]:
            parsed_dict["user_request"] = user_request
        return FinalRecommendation.model_validate(parsed_dict)
    except Exception as e:
        logger.error(f"Failed to parse output as JSON: {e}, raw text: {raw_text}")
        # Fallback graceful recommendation object
        return FinalRecommendation(
            user_request=user_request,
            recommended_products=[],
            summary=cleaned[:300] if cleaned else "No recommendation summary produced."
        )


def run_workflow(user_request: str):
    """Executes the 3-agent Crew and saves/logs recommendations."""
    logger.info(f"Starting workflow for request: {user_request}")

    crew = build_crew(user_request)
    result = crew.kickoff()

    logger.info("Crew execution completed")

    final_answer = _parse_final_recommendation(result.raw, user_request)
    final_answer_dict = final_answer.model_dump()

    output_path = os.path.join(OUTPUT_DIR, "final_recommendation.json")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(final_answer.model_dump_json(indent=2))

    save_search(user_request, final_answer_dict)
    return final_answer, output_path


# ==========================================
# 7. FASTAPI APPLICATION
# ==========================================

app = FastAPI(title="Multi-Agent Product Advisor")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RecommendationRequest(BaseModel):
    user_request: str = Field(
        description="What the user is looking for, e.g. 'laptop for programming under 2500 DT'"
    )


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/recommend", response_model=FinalRecommendation)
def recommend(request: RecommendationRequest):
    try:
        final_answer, _ = run_workflow(request.user_request)
        return final_answer
    except Exception as e:
        logger.error(f"Workflow error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/searches")
def list_searches(limit: int = 10):
    return get_previous_searches(limit=limit)


# ==========================================
# 8. PROGRAM ENTRY POINT
# ==========================================

def main():
    print("=" * 50)
    print("      MULTI-AGENT PRODUCT ADVISOR")
    print("=" * 50)

    user_request = input("\nWhat product are you looking for?\n> ").strip()
    if not user_request:
        user_request = "Best laptop for programming under 2500 DT with 16GB RAM"
        print(f"Using default query: {user_request}")

    print("\nProcessing request with AI Agents...\n")

    try:
        final_answer, output_path = run_workflow(user_request)
        print("\n" + "=" * 50)
        print("FINAL RECOMMENDATION")
        print("=" * 50)
        print(f"Summary: {final_answer.summary}\n")
        for i, prod in enumerate(final_answer.recommended_products, 1):
            print(f"{i}. {prod.name}")
            print(f"   Price: {prod.price} | RAM: {prod.ram}GB | CPU: {prod.cpu} | Score: {prod.score}")
            print(f"   Reason: {prod.reason}")
            print(f"   Source: {prod.source_url}\n")
        print(f"Structured result saved to: {output_path}")
    except Exception as e:
        print(f"Error executing workflow: {e}")


if __name__ == "__main__":
    main()