"""
MULTI-AGENT PRODUCT ADVISOR (CrewAI + FastAPI, Tavily search, JSON output via Pydantic)
==========================================================================================
A beginner-friendly, single-file Multi-Agent AI application built with CrewAI.
Products are found on the real web using the Tavily search API. All 3 agents
run inside ONE Crew. The final answer is validated with Pydantic, saved as a
.json file, and logged in MongoDB. A small FastAPI layer exposes the same
workflow over HTTP.

Workflow:
    User Request -> Researcher Agent (searches the web via Tavily) ->
    Analyzer Agent -> Recommender Agent -> final_recommendation.json

Run it in terminal mode:
    python main.py

Run it as a web API:
    uvicorn main:app --reload
    (then open http://127.0.0.1:8000/docs)
"""

# ==========================================
# 1. IMPORTS
# ==========================================
import os
import json
import logging
from typing import List
import time
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from pymongo import MongoClient
from tavily import TavilyClient
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from crewai import Agent, Task, Crew, Process, LLM
from crewai.tools import tool



# ==========================================
# 2. CONFIGURATION
# ==========================================

# Load variables from the .env file into the environment.
# We NEVER hard-code secrets (API keys, database URIs) directly in the
# code because:
#   1. If you push your code to GitHub, they would be leaked publicly.
#   2. Different people/environments (your laptop, a server, a teammate)
#      can use different values without changing the code.
#   3. It's a security best practice used in every real-world project.
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")

if not GROQ_API_KEY:
    raise ValueError(
        "GROQ_API_KEY is missing. Create a .env file and add: GROQ_API_KEY=your_key_here"
    )

if not TAVILY_API_KEY:
    raise ValueError(
        "TAVILY_API_KEY is missing. Create a .env file and add: TAVILY_API_KEY=your_key_here"
    )

# Where output files are written: one .md per task step (for debugging)
# and the final answer as .json (the real deliverable).
OUTPUT_DIR = "outputs"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Simple logging so we can see what's happening, step by step.
logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


# ==========================================
# 3. DATABASE (MongoDB) — search history only
# ==========================================
#
# We no longer store the product catalog in MongoDB, because products now
# come live from the web via Tavily. MongoDB is still useful to keep a
# history of what users searched for and what was recommended.

client = MongoClient(MONGODB_URI)
db = client["product_advisor"]
searches_col = db["searches"]


def save_search(user_request, final_answer_dict):
    """Saves a record of what the user asked and what the crew recommended."""
    searches_col.insert_one({
        "user_request": user_request,
        "recommendation": final_answer_dict,
    })


def get_previous_searches(limit=10):
    """Returns the most recent searches, newest first."""
    return list(searches_col.find({}, {"_id": 0}).sort("_id", -1).limit(limit))


# ==========================================
# 4. LLM CONFIGURATION
# ==========================================

# One shared LLM object, passed to every CrewAI Agent via llm=basic_llm.
# CrewAI knows which provider to use from the "groq/" prefix in the model
# name. You can swap the model for any model available on Groq
# (e.g. "groq/llama-3.1-8b-instant" for a faster/cheaper option).
basic_llm = LLM(
    model="groq/openai/gpt-oss-20b",
    api_key=GROQ_API_KEY,
    temperature=0.3,
    max_retries=8,
    request_timeout=120,
)


# ==========================================
# 5. PYDANTIC OUTPUT SCHEMA
# ==========================================
#
# Pydantic lets us describe EXACTLY what shape the final answer must have,
# and it automatically validates the LLM's output against that shape.
# If the LLM's JSON is missing a field or has the wrong type, Pydantic
# raises a clear error instead of letting bad data silently pass through.

class RecommendedProduct(BaseModel):
    name: str = Field(description="Product name")
    price: float = Field(description="Price of the product, in the currency mentioned by the user (0 if unknown)")
    cpu: str = Field(description="CPU / processor, or 'unknown' if not found")
    ram: int = Field(description="RAM in GB (0 if unknown)")
    battery_hours: int = Field(description="Battery life in hours (0 if unknown)")
    score: int = Field(description="Score calculated by the Score Products tool")
    reason: str = Field(description="Short explanation of why this product is recommended")
    source_url: str = Field(description="The web page this product info came from")


class FinalRecommendation(BaseModel):
    user_request: str = Field(description="The original request written by the user")
    recommended_products: List[RecommendedProduct] = Field(
        description="The top recommended products, best first"
    )
    summary: str = Field(description="A short, friendly overall summary for the user")


# ==========================================
# 6. TOOLS
# ==========================================
#
# Tools are normal Python functions that an Agent can call to get
# information or to run an exact calculation.
#
#   Agent -> Tool -> Tavily web search / Python logic -> Result -> Agent
#
# search_products_tool now searches the REAL web via Tavily instead of a
# fixed catalog. Tavily returns page titles, URLs, and text snippets — it
# does NOT return a guaranteed structured schema (no fixed "price" or
# "ram" field). That means the Researcher Agent (LLM) has to read the
# snippets and extract whatever specs it can find, which is less exact
# than a real database. score_products_tool still does the MATH in plain
# Python on whatever numbers the researcher extracted — Python never
# invents a score, but the underlying numbers now depend on what Tavily
# found on the web and how well the LLM read them.

tavily_client = TavilyClient(api_key=TAVILY_API_KEY)


@tool("Search Products")
def search_products_tool(query: str) -> str:
    """
    Searches the real web (via Tavily) for products matching the query,
    e.g. "best laptop for programming under 2500 DT". Returns a JSON
    string with a list of results, each containing 'title', 'url', and
    'content' (a text snippet about the product/page).
    """
    response = tavily_client.search(
        query=query,
        search_depth="basic",
        max_results=2,          # كان 6 ثم 4
    )
    results = [
        {
            "title": item.get("title", "")[:80],
            "url": item.get("url", ""),
            "content": item.get("content", "")[:150],  # قصّرها أكثر
        }
        for item in response.get("results", [])
    ]
    return json.dumps(results)


def calculate_score(product, requirements):
    """Plain Python, deterministic scoring rule."""
    score = 0
    budget = requirements.get("budget", 999999)

    if product.get("price", 0) and product["price"] <= budget:
        score += 30

    if product.get("ram", 0) >= 16:
        score += 20

    if product.get("battery_hours", 0) >= 8:
        score += 20

    if requirements.get("use_case", "").lower() in product.get("use_case", "").lower():
        score += 30

    return score


@tool("Score Products")
def score_products_tool(products_and_requirements_json: str) -> str:
    """
    Takes a JSON string shaped like:
    {"requirements": {"use_case": "...", "budget": number},
     "products": [{"name":..., "price":..., "ram":..., "battery_hours":..., "use_case":..., "source_url":...}, ...]}
    and returns a JSON array of the same products, each with an added
    "score" field, sorted from best to worst. The score is calculated by
    plain Python (calculate_score), never invented by the LLM.
    """
    data = json.loads(products_and_requirements_json)
    requirements = data.get("requirements", {})
    products = data.get("products", [])

    scored = [{**p, "score": calculate_score(p, requirements)} for p in products]
    scored.sort(key=lambda item: item["score"], reverse=True)

    return json.dumps(scored)

def wait_for_tpm_reset(task_output):
    logger.info("Waiting 25s to let TPM quota refill...")
    time.sleep(25)
# ==========================================
# 7. AGENT 1 — RESEARCHER
# ==========================================

researcher_agent = Agent(
    role="Senior Product Research Specialist",
    goal=(
        "Given a user request, do the following in order:\n"
        "1) Extract the use_case (e.g. 'programming', 'gaming', 'office work', "
        "'video editing') and the budget (as a number, in the currency the user "
        "mentioned). If the budget or use_case is ambiguous, make the most "
        "reasonable assumption and note it — never leave them blank.\n"
        "2) Build ONE precise, high-signal search query (include use case, "
        "budget, and year if relevant) and call the Search Products tool with it. "
        "If the first results are thin or irrelevant, refine the query once and "
        "search again rather than giving up.\n"
        "3) From the titles/snippets returned, extract as many DISTINCT real "
        "products as possible (never merge two different products into one "
        "entry, never invent a product that isn't backed by a search result).\n"
        "4) For every field you cannot find explicit evidence for in the search "
        "results, use the documented default (price=0, cpu='unknown', ram=0, "
        "battery_hours=0) — never guess or estimate a number that wasn't stated "
        "on the page.\n"
        "5) Output ONLY the raw JSON object described in expected_output — no "
        "markdown fences, no commentary, no trailing text."
    ),
    backstory=(
        "You are a meticulous hardware researcher with 10 years of experience "
        "comparing consumer electronics. You have zero tolerance for making up "
        "specs — you would rather mark a field 'unknown' than guess, because a "
        "wrong spec is worse than a missing one. You are also skilled at reading "
        "between the lines of messy e-commerce or review snippets to reliably "
        "pull out concrete numbers (price, RAM, battery life) when they ARE "
        "present."
    ),
    tools=[search_products_tool],
    llm=basic_llm,
    verbose=True,
)


#==========================================
# 8. AGENT 2 — ANALYZER
# ==========================================

analyzer_agent = Agent(
    role="Quantitative Product Analyst",
    goal=(
        "Take the Researcher's JSON output (requirements + products) exactly as "
        "given, wrap it into the input shape expected by the Score Products "
        "tool, and call that tool exactly once. Do not modify, filter, "
        "reformat, re-sort, or add any field to the products before sending "
        "them to the tool — pass them through faithfully. After the tool "
        "returns, output its JSON result completely unchanged: same fields, "
        "same order, same values. You are strictly forbidden from computing, "
        "adjusting, or rounding any score yourself, even if a score looks "
        "'wrong' to you — the tool's math is the single source of truth."
    ),
    backstory=(
        "You are a meticulous, almost obsessively literal analyst. You know "
        "that LLMs are unreliable at arithmetic, so you never trust your own "
        "mental math for scoring — you always delegate to the deterministic "
        "Score Products tool and treat its output as ground truth. Your only "
        "value-add is making sure the tool gets clean, correctly-shaped input."
    ),
    tools=[score_products_tool],
    llm=basic_llm,
    verbose=True,
)



# ==========================================
# 9. AGENT 3 — RECOMMENDER
# ==========================================

recommender_agent = Agent(
    role="Customer-Facing Recommendation Advisor",
    goal=(
        "From the ranked, scored product list you receive as context (already "
        "sorted best-first), select the top 3 products (or fewer if fewer than "
        "3 exist) and produce a final answer matching the FinalRecommendation "
        "schema exactly.\n"
        "For each selected product:\n"
        "- Write a short (1-3 sentence), specific reason tied to the user's "
        "actual use_case and budget — not a generic compliment.\n"
        "- Explicitly flag any spec that is 0 or 'unknown' as 'not found on the "
        "source page' inside the reason, so the user isn't misled into thinking "
        "it's confirmed missing (e.g. 0 RAM) rather than just unreported.\n"
        "- Preserve the exact source_url from the input — never fabricate or "
        "alter a URL.\n"
        "Also write a 2-4 sentence summary that honestly reflects the overall "
        "quality of the results (e.g. if all scores are low or data is sparse, "
        "say so plainly instead of overselling).\n"
        "Never invent a product, spec, or score that isn't present in the data "
        "you received.\n"
        "ALWAYS respond with raw JSON only — no markdown code fences (no ```), "
        "no explanation text before or after the JSON object."
    ),
    backstory=(
        "You are a trustworthy shopping advisor who cares more about the "
        "customer making a good decision than about sounding impressive. You "
        "write in clear, friendly, concise language, you're transparent about "
        "gaps in the data, and you never dress up incomplete information as "
        "certainty."
    ),
    llm=basic_llm,
    verbose=True,
)


# ==========================================
# 10. MAIN WORKFLOW
# ==========================================
#
# All 3 agents and their tasks are wired into ONE Crew, chained together
# with `context=`. The final task uses output_pydantic=FinalRecommendation
# so CrewAI forces (and validates) the answer into our exact schema, which
# we then save as a real .json file on disk AND log into MongoDB.

def build_crew(user_request):
    """
    Builds fresh Task objects (and the Crew that runs them) for a given
    user request. We rebuild it every run because the task descriptions
    depend on the user's input, which changes each time.
    """

    research_task = Task(
        description=(
            f"The user's request is: '{user_request}'.\n"
            "1. Figure out the use case (e.g. programming, gaming, office) "
            "and the approximate budget mentioned by the user.\n"
            "2. Use the Search Products tool with a good search query built from "
            "the request (e.g. 'best laptop for programming under 2500 DT') to "
            "find real products on the web.\n"
            "3. From the search results' titles and content, extract as many "
            "products as you can, with these fields: name, price (0 if unknown), "
            "cpu ('unknown' if not found), ram (0 if unknown), battery_hours "
            "(0 if unknown), use_case, source_url (the result's url).\n"
            "4. Return ONLY valid JSON, no extra text, in this exact shape:\n"
            '{"requirements": {"use_case": "...", "budget": number}, '
            '"products": [ {...}, {...} ] }'
        ),
        expected_output="A single valid JSON object with keys 'requirements' and 'products'.",
        agent=researcher_agent,
        output_file=os.path.join(OUTPUT_DIR, "1_research_result.md"),
        callback=wait_for_tpm_reset,
    )

    analysis_task = Task(
        description=(
            "You will receive the researcher's JSON output (requirements + products) "
            "as context. Pass that exact JSON, unchanged, as input to the Score "
            "Products tool. Then return ONLY the tool's exact JSON output — do not "
            "modify, reorder, or invent any score yourself."
        ),
        expected_output="A JSON array of products, each with a 'score' field, sorted best first.",
        agent=analyzer_agent,
        context=[research_task],
        output_file=os.path.join(OUTPUT_DIR, "2_analysis_result.md"),
        callback=wait_for_tpm_reset,
    )

    recommendation_task = Task(
        description=(
            f"The user's original request was: '{user_request}'.\n"
            "You will receive the ranked, scored product list as context "
            "(already sorted best first by a Python tool). Select the top 3 "
            "products and write a short reason for each one, mentioning that "
            "specs marked as 0 or 'unknown' were not found on the source page. "
            "Do not invent products, specs, or scores that are not in the data "
            "you received. Keep each product's source_url."
        ),
        expected_output=(
            "A JSON object matching the FinalRecommendation schema exactly: "
            "user_request (string), recommended_products (list of products with "
            "name, price, cpu, ram, battery_hours, score, reason, source_url), "
            "and summary (string)."
        ),
        agent=recommender_agent,
        context=[analysis_task],
        output_pydantic=FinalRecommendation,
        callback=wait_for_tpm_reset,
    )

    crew = Crew(
    agents=[researcher_agent, analyzer_agent, recommender_agent],
    tasks=[research_task, analysis_task, recommendation_task],
    process=Process.sequential,
    verbose=True,
    max_rpm=2,  # limite les appels/minute pour respecter le quota Groq gratuit
)

    return crew


def run_workflow(user_request):
    """
    Builds the single Crew (3 agents, 3 tasks, chained via context=),
    runs it, saves the final Pydantic-validated answer as a .json file,
    and logs the search into MongoDB.
    """
    logger.info("Starting crew: researcher -> analyzer -> recommender")

    crew = build_crew(user_request)
    result = crew.kickoff()

    logger.info("Crew finished")

    # result.pydantic is a real FinalRecommendation object (validated by
    # Pydantic), because the last task used output_pydantic=FinalRecommendation.
    final_answer: FinalRecommendation = result.pydantic
    final_answer_dict = final_answer.model_dump()

    output_path = os.path.join(OUTPUT_DIR, "final_recommendation.json")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(final_answer.model_dump_json(indent=2))

    logger.info(f"Final answer saved to {output_path}")

    save_search(user_request, final_answer_dict)
    logger.info("Search logged in MongoDB")

    return final_answer, output_path


# ==========================================
# 11. FASTAPI APP
# ==========================================
#
# This turns the exact same run_workflow() function into a small web API,
# so other programs (a website, a mobile app, Postman, curl...) can call
# your Multi-Agent Product Advisor over HTTP instead of typing in a
# terminal. Nothing about the agents changes — the API is just a thin
# wrapper around the same run_workflow() you already have.
#
# Run the API with:
#     uvicorn main:app --reload
#
# Then open http://127.0.0.1:8000/docs for an interactive test page
# (this is auto-generated by FastAPI from the Pydantic models below).

app = FastAPI(title="Multi-Agent Product Advisor")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RecommendationRequest(BaseModel):
    """The JSON body the API expects: just the user's request as text."""
    user_request: str = Field(
        description="What the user is looking for, e.g. 'laptop for programming under 2500 DT'"
    )


@app.get("/health")
def health_check():
    """Simple endpoint to check the API is running."""
    return {"status": "ok"}


@app.post("/recommend", response_model=FinalRecommendation)
def recommend(request: RecommendationRequest):
    """
    Runs the full Researcher -> Analyzer -> Recommender crew for the given
    request and returns the structured, Pydantic-validated recommendation
    as JSON.
    """
    try:
        final_answer, _ = run_workflow(request.user_request)
        return final_answer
    except Exception as e:
        # Turn any internal error into a clean HTTP 500 response instead
        # of crashing the server.
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/searches")
def list_searches(limit: int = 10):
    """Returns the most recent searches saved in MongoDB."""
    return get_previous_searches(limit=limit)


# ==========================================
# 12. PROGRAM ENTRY POINT (terminal mode)
# ==========================================
#
# There are now two ways to use this project:
#   1. Terminal mode:  python main.py           (asks one question, prints the answer)
#   2. API mode:       uvicorn main:app --reload (starts a web server, see section 11)

def main():
    print("=" * 40)
    print("      MULTI-AGENT PRODUCT ADVISOR")
    print("=" * 40)

    user_request = input("\nWhat product are you looking for?\n> ")

    print("\nProcessing...\n")

    try:
        final_answer, output_path = run_workflow(user_request)
        print("=" * 40)
        print("FINAL RECOMMENDATION")
        print("=" * 40)
        print(final_answer.summary)
        print(f"\nFull structured answer saved to: {output_path}")
    except Exception as e:
        # Simple, beginner-friendly error handling.
        # Things that can fail here: no internet connection, no MongoDB
        # server running, an invalid or expired API key (Groq or
        # Tavily), hitting a rate limit, or an agent returning something
        # that doesn't match the Pydantic schema.
        print(f"Error: {e}")


if __name__ == "__main__":
    main()