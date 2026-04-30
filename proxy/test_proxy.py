from fastapi.testclient import TestClient
from proxy_app import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    print("Health check passed:", response.json())

def test_chat_validation():
    # Test with invalid workspace URL
    response = client.post("/chat", json={
        "messages": [{"role": "user", "content": "Hi"}],
        "endpointName": "test-endpoint",
        "apiToken": "test-token",
        "workspaceUrl": "http://invalid-url" # Missing https
    })
    assert response.status_code == 400
    print("URL validation passed:", response.json())

if __name__ == "__main__":
    print("Testing Databricks Chatbot Proxy...")
    test_health()
    test_chat_validation()
    print("All basic tests passed!")
