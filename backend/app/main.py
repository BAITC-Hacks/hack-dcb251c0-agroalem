from fastapi import FastAPI

from .catalog import load_catalog

app = FastAPI(title="Voice Router Backend")


@app.get("/health")
def health() -> dict[str, object]:
    catalog = load_catalog()
    return {
        "status": "ok",
        "business_scenarios": len(catalog.scenarios),
        "system_intents": len(catalog.system_intents),
    }
