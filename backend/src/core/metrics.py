from prometheus_client import Histogram

login_find_user = Histogram(
    "login_find_user_seconds",
    "Time spent finding the user in MongoDB",
)

login_verify_password = Histogram(
    "login_verify_password_seconds",
    "Time spent verifying the password",
)

login_create_access_token = Histogram(
    "login_create_access_token_seconds",
    "Time spent generating the access token",
)

login_create_refresh_token = Histogram(
    "login_create_refresh_token_seconds",
    "Time spent generating the refresh token",
)

login_store_refresh_token = Histogram(
    "login_store_refresh_token_seconds",
    "Time spent storing the refresh token",
)

login_total = Histogram(
    "login_total_seconds",
    "Total login endpoint latency",
)
