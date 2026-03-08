# AI Study Mentor for Competitive Exams

An AI-powered study assistant for **JEE, NIMCET & GATE** preparation, built with **Amazon Nova** models via **AWS Bedrock**.

![Tech Stack](https://img.shields.io/badge/React-Vite-blue) ![Node](https://img.shields.io/badge/Node.js-Express-green) ![DB](https://img.shields.io/badge/MongoDB-Mongoose-brightgreen) ![AI](https://img.shields.io/badge/AI-Amazon_Nova-orange)

---

## Features

| Feature | Description |
|---------|-------------|
| 📸 **Image Solver** | Upload a photo of a math problem → AI extracts and solves it step-by-step |
| 💬 **AI Chat Tutor** | Ask questions and get clear explanations from a friendly AI mentor |
| 🎤 **Voice Input** | Speak your question using the microphone (Web Speech API) |
| 📝 **Practice Tests** | Generate topic-wise MCQ quizzes with scoring and explanations |
| 📊 **Dashboard** | View accuracy by topic, weak areas, and AI study recommendations |

---

## Tech Stack

- **Frontend:** React 18, Tailwind CSS, Vite, Axios, React Router, Web Speech API
- **Backend:** Node.js, Express, Mongoose
- **Database:** MongoDB
- **AI:** Amazon Nova Lite (via AWS Bedrock) — text reasoning + multimodal image understanding

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- MongoDB (local or [Atlas](https://www.mongodb.com/atlas))
- AWS account with Bedrock access to Amazon Nova models

### 1. Clone the repo

```bash
git clone <repo-url>
cd amazonnova
```

### 2. Configure environment variables

```bash
cp server/.env.example server/.env
```

Edit `server/.env` with your credentials:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
MONGODB_URI=mongodb://localhost:27017/study-mentor
JWT_SECRET=any_random_string
PORT=5000
```

### 3. Install dependencies

```bash
# Backend
cd server && npm install

# Frontend
cd ../client && npm install
```

### 4. Start the application

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Project Structure

```
amazonnova/
├── client/                     # React frontend
│   ├── src/
│   │   ├── components/         # ChatBox, ImageUpload, VoiceButton, TestGenerator
│   │   ├── pages/              # Home, Solve, Chat, Practice, Dashboard
│   │   ├── services/           # Axios API wrapper
│   │   ├── App.jsx             # Router + navbar
│   │   ├── main.jsx            # Entry point
│   │   └── index.css           # Tailwind + custom styles
│   ├── index.html
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── server/                     # Node.js backend
│   ├── controllers/            # aiController.js
│   ├── models/                 # User, Test, Attempt (Mongoose)
│   ├── routes/                 # aiRoutes.js, userRoutes.js
│   ├── services/               # novaService.js (AWS Bedrock)
│   ├── server.js               # Express entry point
│   └── .env.example
│
└── README.md
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/solve-question` | Upload image → AI solution |
| POST | `/api/chat` | Send messages → AI reply |
| POST | `/api/generate-test` | Generate practice test |
| POST | `/api/submit-attempt` | Save test attempt |
| POST | `/api/analyze-performance` | Get weak topic analysis |
| POST | `/api/users/register` | Register student |
| POST | `/api/users/login` | Login student |
| GET | `/api/users/:id/attempts` | Fetch attempt history |

---

## Amazon Nova Integration

All AI calls go through `server/services/novaService.js`:

- **Model:** `amazon.nova-lite-v1:0` via `@aws-sdk/client-bedrock-runtime`
- **Image Understanding:** Sends base64 image as a multimodal content block
- **Prompt Templates:** Embedded in the service with clear comments
- **Response Parsing:** Extracts text from Nova's `output.message.content[0].text`

---

## License

MIT
# hclmentor
