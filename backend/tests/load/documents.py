from locust import HttpUser, SequentialTaskSet, between, task
from locust.exception import StopUser


class DocumentsFlow(SequentialTaskSet):
    """Load test for document endpoints."""

    def on_start(self):
        """Initialize user state."""

        self.access_token = None
        self.refresh_token = None

    @task
    def login(self):
        """Simulate user login."""

        payload = {
            "email": "uddith89855@gmail.com",
            "password": "Raju@2003",
        }

        with self.client.post("/auth/login", json=payload, catch_response=True, name="01_login") as response:

            if response.status_code != 200:
                response.failure(f"Failed to login: {response.text}")
                raise StopUser()

            data = response.json()

            self.access_token = data.get("access_token")
            self.refresh_token = data.get("refresh_token")

            if not self.access_token or not self.refresh_token:
                response.failure("Login succeeded but tokens are missing.")
                raise StopUser()

            response.success()

    # @task
    # def upload_document(self):
    #     """Request upload URL."""

    #     if not self.access_token:
    #         raise StopUser()

    #     headers = {"Authorization": f"Bearer {self.access_token}"}

    #     payload = {
    #         "document_id": "7c08d93e-c765-4b92-ac3d-570d476a872b",
    #         "file_name": "M.Sanjay Uddith Raju Resume.pdf",
    #         "content_type": "application/pdf",
    #     }

    #     with self.client.post("/documents/upload-url", json=payload, headers=headers, catch_response=True, name="02_upload_url") as response:

    #         if response.status_code == 200:
    #             response.success()
    #         else:
    #             response.failure(f"Failed to get upload URL: {response.text}")
    #             raise StopUser()

    @task
    def confirm_upload(self):
        """Confirm upload."""

        if not self.access_token:
            raise StopUser()

        headers = {"Authorization": f"Bearer {self.access_token}"}

        payload = {
            "document_id": "2f55e27e-6aee-423c-95d9-6e75009ea474",
            "file_name": "rag_platform_system_design.pdf",
            "file_key": "6a0303e809686744d9b18656/2f55e27e-6aee-423c-95d9-6e75009ea474/rag_platform_system_design.pdf",
            "file_type": "application/pdf",
            "file_size": 260351,
        }

        with self.client.post("/documents/conform-upload", json=payload, headers=headers, catch_response=True, name="03_confirm_upload") as response:

            if response.status_code == 201:
                response.success()
            else:
                response.failure(f"Failed to confirm upload: {response.text}")
                raise StopUser()

    @task
    def refresh(self):
        """Refresh the access token."""

        payload = {"refresh_token": self.refresh_token}

        with self.client.post("/auth/refresh", json=payload, catch_response=True, name="04_refresh") as response:

            if response.status_code != 200:
                response.failure(f"Failed to refresh token: {response.text}")
                raise StopUser()

            data = response.json()

            self.access_token = data.get("access_token")
            self.refresh_token = data.get("refresh_token")

            if not self.access_token or not self.refresh_token:
                response.failure("Refresh succeeded but tokens are missing.")
                raise StopUser()

            response.success()

    @task
    def logout(self):
        """Logout."""

        payload = {"refresh_token": self.refresh_token}

        with self.client.post("/auth/logout", json=payload, catch_response=True, name="05_logout") as response:

            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Failed to logout: {response.text}")

        # End this virtual user after one complete flow
        raise StopUser()


class DocumentsUser(HttpUser):
    """Locust user for document load testing."""

    tasks = [DocumentsFlow]
    wait_time = between(1, 3)
