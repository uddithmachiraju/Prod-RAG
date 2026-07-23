import time

from locust import HttpUser, SequentialTaskSet, between, task


class DocumentsFlow(SequentialTaskSet):
    """load test for document endpoints."""

    def on_start(self):
        """Set up the test by logging in and obtaining an access token."""

        self.access_token = None
        self.refresh_token = None

        self.login()
        self.stream_query()
        # self.refresh()
        # self.logout()

    @task
    def login(self):
        """Simulate user login."""

        payload = {"email": "uddith89855@gmail.com", "password": "Raju@2003"}

        with self.client.post("/auth/login", json=payload, catch_response=True) as response:
            if response.status_code == 200:

                data = response.json()

                self.access_token = data.get("access_token")
                self.refresh_token = data.get("refresh_token")

                response.success()
            else:
                response.failure(f"Failed to login: {response.text}")

    @task
    def stream_query(self):
        "Simulate response streaming from LLM."

        # chat_id	"6a607f2df0b2a2f4981b111a"
        # document_id	"c7a4e803-e3ef-42d4-8e7d-0edc871a8787"
        # query	"Summarize this document in 3 bullet points"
        # top_k	5
        # user_id	"6a0303e809686744d9b18656"

        payload = {
            "query": "Summarize this document in 3 bullet points",
            "chat_id": "6a607f2df0b2a2f4981b111a",
            "document_id": "c7a4e803-e3ef-42d4-8e7d-0edc871a8787",
            "user_id": "6a0303e809686744d9b18656",
            "top_k": 5,
        }

        headers = {"Authorization": f"Bearer {self.access_token}"}

        start = time.perf_counter()
        with self.client.post("/retrieve/query/stream", json=payload, headers=headers, stream=True, catch_response=True, name="/query/stream") as response:
            if response.status_code != 200:
                response.failure(f"HTTP {response.status_code}")
                return
            try:
                full_response = ""
                for line in response.iter_lines(decode_unicode=True):
                    if line:
                        full_response += line
                elapsed_ms = (time.perf_counter() - start) * 1000
                response.request_meta["response_time"] = elapsed_ms
                response.success()
            except Exception as e:
                response.failure(str(e))

    # @task
    # def refresh(self):
    #     """Simulate token refresh."""

    #     payload = {"refresh_token": self.refresh_token}

    #     with self.client.post("/auth/refresh", json=payload, catch_response=True) as response:
    #         if response.status_code == 200:

    #             data = response.json()

    #             self.access_token = data.get("access_token")
    #             self.refresh_token = data.get("refresh_token")

    #             response.success()
    #         else:
    #             response.failure(f"Failed to refresh token: {response.text}")

    # @task
    # def logout(self):
    #     """Simulate user logout."""

    #     payload = {"refresh_token": self.refresh_token}

    #     with self.client.post("/auth/logout", json=payload, catch_response=True) as response:
    #         if response.status_code == 200:
    #             response.success()
    #         else:
    #             response.failure(f"Failed to logout: {response.text}")


class DocumentsUser(HttpUser):
    """Locust user for document load testing."""

    tasks = [DocumentsFlow]
    wait_time = between(1, 5)
