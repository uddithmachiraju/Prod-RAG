from locust import HttpUser, SequentialTaskSet, between, task


class AuthFlow(SequentialTaskSet):
    """Load test for authentication endpoints."""

    def on_start(self):

        self.access_token = None
        self.refresh_token = None

        # self.login()
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
    def refresh(self):
        """Simulate token refresh."""

        payload = {"refresh_token": self.refresh_token}

        with self.client.post("/auth/refresh", json=payload, catch_response=True) as response:
            if response.status_code == 200:

                data = response.json()

                self.access_token = data.get("access_token")
                self.refresh_token = data.get("refresh_token")

                response.success()
            else:
                response.failure(f"Failed to refresh token: {response.text}")

    # @task
    # def logout(self):
    #     """Simulate user logout."""

    #     payload = {"refresh_token": self.refresh_token}

    #     with self.client.post("/auth/logout", json=payload, catch_response=True) as response:
    #         if response.status_code == 200:
    #             response.success()
    #         else:
    #             response.failure(f"Failed to logout: {response.text}")


class AuthenticationUser(HttpUser):
    """Locust user for authentication load testing."""

    tasks = [AuthFlow]
    wait_time = between(1, 5)
