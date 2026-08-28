from dotenv import load_dotenv
import os
from pymongo import MongoClient

load_dotenv()
uri = os.getenv("MONGODB_URI")

client = MongoClient(uri, serverSelectionTimeoutMS=5000)
try:
    client.admin.command("ping")
    print("✅ Connexion réussie à MongoDB")
except Exception as e:
    print("❌ Échec de connexion :", e)