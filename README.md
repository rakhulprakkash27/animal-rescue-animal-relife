# Rescue Connect

A small full-stack animal rescue reporting app. A user uploads an animal photo, adds the location and condition, and the backend creates a report and sends it to configured rescue-team webhooks.

## Run locally

1. Install Node.js 18 or newer.
2. In this folder run `npm install`.
3. Copy `.env.example` to `.env`.
4. Run `npm start`.
5. Open `http://localhost:3000`.

Without webhook configuration, reports are saved with a `Demo rescue queue` notification so the complete flow can be tested locally. Reports are stored in `reports.json` and images in `uploads/`.

## Connect Blue Cross or other teams

Set `RESCUE_WEBHOOKS` in `.env` to a JSON array of HTTPS webhook URLs supplied by the rescue organizations, for example:

```env
RESCUE_WEBHOOKS=["https://your-notification-service.example/webhook"]
```

The server POSTs a JSON report containing the report ID, animal type, urgency, description, location, timestamp, and image URL. For production, use HTTPS, authentication/signatures on the webhook, a database, cloud image storage, malware scanning, rate limiting, and an authenticated admin view. Do not put team API keys in frontend code.
