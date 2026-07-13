from locust import HttpUser, SequentialTaskSet, between, task


class DocumentsFlow(SequentialTaskSet):
    """load test for document endpoints."""

    def on_start(self):
        """Set up the test by logging in and obtaining an access token."""

        self.access_token = None
        self.refresh_token = None

        self.login()
        self.upload_document()
        self.conform_upload()
        self.refresh()
        self.logout()

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
    def upload_document(self):
        """Simulate document upload."""

        headers = {"Authorization": f"Bearer {self.access_token}"}
        payload = {
            "document_id": "12345",
            "file_name": "test_document.pdf",
            "content_type": "application/pdf",
        }

        with self.client.post("/documents/upload-url", json=payload, headers=headers, catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Failed to get upload URL: {response.text}")

    @task
    def conform_upload(self):
        """Simulate conforming the document upload."""

        headers = {"Authorization": f"Bearer {self.access_token}"}

        payload = {
            "document_id": "7c08d93e-c765-4b92-ac3d-570d476a872b",
            "file_name": "M.Sanjay Uddith Raju Resume.pdf",
            "file_key": "6a0303e809686744d9b18656/7c08d93e-c765-4b92-ac3d-570d476a872b/M.Sanjay Uddith Raju Resume.pdf",
            "file_type": "application/pdf",
            "file_size": 107733,
        }

        with self.client.post("/documents/conform-upload", json=payload, headers=headers, catch_response=True) as response:
            if response.status_code == 201:
                response.success()
            else:
                response.failure(f"Failed to conform upload: {response.text}")

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

    @task
    def logout(self):
        """Simulate user logout."""

        payload = {"refresh_token": self.refresh_token}

        with self.client.post("/auth/logout", json=payload, catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Failed to logout: {response.text}")


class DocumentsUser(HttpUser):
    """Locust user for document load testing."""

    tasks = [DocumentsFlow]
    wait_time = between(1, 5)
