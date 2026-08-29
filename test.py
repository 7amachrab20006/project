import os
import sys
from dotenv import load_dotenv
from pymongo import MongoClient

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

load_dotenv()
uri = os.getenv("MONGODB_URI")

client = MongoClient(uri, serverSelectionTimeoutMS=5000)
try:
    client.admin.command("ping")
    print("✅ Connexion réussie à MongoDB")
except Exception as e:
    print("❌ Échec de connexion :", e)