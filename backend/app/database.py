import os
import time
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError

MONGODB_URL      = os.getenv("MONGODB_URL", "mongodb://mongo:27017")
MANUFACTURING_DB = os.getenv("MANUFACTURING_DB", "geoship_manufacturing")

_client = None


def _get_client():
    global _client
    if _client is not None:
        return _client

    max_retries = 5
    retry_delay = 2

    for attempt in range(max_retries):
        try:
            _client = MongoClient(
                MONGODB_URL,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
                socketTimeoutMS=5000,
            )
            _client.admin.command("ping")
            return _client
        except (ServerSelectionTimeoutError, Exception) as e:
            if attempt < max_retries - 1:
                print(f"MongoDB connection attempt {attempt + 1}/{max_retries} failed: {e}")
                time.sleep(retry_delay)
            else:
                raise Exception(f"Failed to connect to MongoDB after {max_retries} attempts: {e}")


def get_db():
    return _get_client()[MANUFACTURING_DB]


def next_id(collection_name: str) -> int:
    result = get_db().counters.find_one_and_update(
        {"_id": collection_name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    return result["seq"]


def doc_to_dict(doc) -> dict | None:
    if doc is None:
        return None
    d = dict(doc)
    if "_id" in d:
        d["id"] = d.pop("_id")
    return d
