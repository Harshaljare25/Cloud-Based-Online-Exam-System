import http.server
import socketserver
import json
import urllib.parse
import traceback
import os

# Import Lambda handlers
from lambda_handlers.auth_handler import lambda_handler as auth_handler
from lambda_handlers.exam_handler import lambda_handler as exam_handler
from lambda_handlers.admin_handler import lambda_handler as admin_handler

PORT = int(os.environ.get('PORT', 5000))

class APIGatewaySimulator(http.server.BaseHTTPRequestHandler):
    """
    Simulates AWS API Gateway and lambda execution locally.
    Parses requests, converts them into AWS Lambda proxy events,
    invokes the appropriate handler, and returns the response.
    """
    
    def log_message(self, format, *args):
        # Override to clean up stdout logs
        print(f"[LOCAL APIGW] {format % args}")

    def do_OPTIONS(self):
        # Handle preflight CORS requests
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_GET(self):
        self.route_request("GET")

    def do_POST(self):
        self.route_request("POST")

    def do_DELETE(self):
        self.route_request("DELETE")

    def route_request(self, method):
        # 1. Parse URL path and query parameters
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query_params = urllib.parse.parse_qs(parsed_url.query)
        # Flatten query parameters (e.g. {'name': ['abc']} -> {'name': 'abc'})
        query_string_parameters = {k: v[0] for k, v in query_params.items()}

        # 2. Read Request Body
        content_length = int(self.headers.get('Content-Length', 0))
        body = ""
        if content_length > 0:
            body = self.rfile.read(content_length).decode('utf-8')

        # 3. Build AWS Lambda Event proxy dictionary
        event = {
            "path": path,
            "httpMethod": method,
            "headers": {k: v for k, v in self.headers.items()},
            "queryStringParameters": query_string_parameters,
            "body": body
        }
        context = {} # Mock empty context

        # 4. Route event to correct Lambda handler based on path prefix
        response = None
        try:
            if path.startswith("/auth/"):
                print(f"Routing to Auth Lambda: {method} {path}")
                response = auth_handler(event, context)
            elif path.startswith("/exams"):
                print(f"Routing to Exam Lambda: {method} {path}")
                response = exam_handler(event, context)
            elif path.startswith("/admin/"):
                print(f"Routing to Admin Lambda: {method} {path}")
                response = admin_handler(event, context)
            else:
                response = {
                    "statusCode": 404,
                    "body": json.dumps({"error": f"Route '{path}' matches no Lambda function."}),
                    "headers": {"Content-Type": "application/json"}
                }
        except Exception as e:
            traceback.print_exc()
            response = {
                "statusCode": 500,
                "body": json.dumps({"error": "Internal Server Error during Lambda simulation", "details": str(e)}),
                "headers": {"Content-Type": "application/json"}
            }

        # 5. Translate Lambda response back to HTTP response
        status_code = response.get('statusCode', 200)
        response_headers = response.get('headers', {})
        response_body = response.get('body', '')

        self.send_response(status_code)
        
        # Write headers
        # Ensure CORS is always allowed locally
        self.send_header("Access-Control-Allow-Origin", "*")
        for k, v in response_headers.items():
            if k.lower() != 'access-control-allow-origin':
                self.send_header(k, v)
        self.end_headers()

        # Write body
        self.wfile.write(response_body.encode('utf-8'))

if __name__ == "__main__":
    # Handler configuration and runner
    handler = APIGatewaySimulator
    print(f"===========================================================")
    print(f" AWS Lambda Simulator API Gateway running on: http://localhost:{PORT}")
    print(f" Make sure your MySQL database is active and schema.sql is imported.")
    print(f" Press Ctrl+C to terminate the local server.")
    print(f"===========================================================")
    
    # Allow port reuse to avoid address already in use errors
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")
