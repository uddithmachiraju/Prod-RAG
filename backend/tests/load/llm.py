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

        payload = {
            "query": "Summarize this document in 3 bullet points",
            "chat_id": "6a5747d3a906f7df3ecaf99f",
            "document_id": "c7ea262a-0ed4-4396-a1b3-36ad9b196fb2",
            "user_id": "6a0303e809686744d9b18656",
            "top_k": 5,
        }

        headers = {"Authorization": f"Bearer {self.access_token}"}

        with self.client.post("/retrieve/query/stream", json=payload, headers=headers, stream=True, catch_response=True, name="/query/stream") as response:

            if response.status_code != 200:
                response.failure(f"HTTP {response.status_code}")
                return

            try:
                full_response = ""

                for line in response.iter_lines(decode_unicode=True):
                    if line:
                        full_response += line

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
