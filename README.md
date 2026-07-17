# 🛒 HyperLocal

A multi-category general store e-commerce web application built for a hackathon. HyperLocal lets users browse products across categories, manage their cart and wishlist, and search & filter items — all through a clean, responsive UI.

🔗 **Live Demo:** [https://hyperlocal-5ukn.onrender.com](https://hyperlocal-5ukn.onrender.com)  
📁 **Repository:** [https://github.com/Vishwajith-J-P/code-to-cloud](https://github.com/Vishwajith-J-P/code-to-cloud)

---

## ✨ Features

- 🔐 **User Authentication** — Secure sign-up, login, and session management
- 🔍 **Search & Filters** — Find products quickly with keyword search and category filters
- 🛒 **Cart & Wishlist** — Add items to cart or save them for later
- 🛠️ **Admin Dashboard** — Manage products, categories, and orders from a dedicated admin panel

---

## 🧰 Tech Stack

| Layer       | Technology            |
|-------------|----------------------|
| Backend     | Flask (Python)        |
| Frontend    | Tailwind CSS          |
| Templating  | Jinja2                |
| Database    | MongoDB               |
| Deployment  | Render                |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.8+
- MongoDB (local or Atlas)
- pip

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Vishwajith-J-P/code-to-cloud.git
   cd code-to-cloud
   ```

2. **Create and activate a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate      # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**

   Create a `.env` file in the root directory:
   ```env
   # MongoDB
   MONGO_URI=your_mongodb_connection_string

   # Google OAuth
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

5. **Run the application**
   ```bash
   python app.py
   ```

   Visit `http://127.0.0.1:5000` in your browser.

---

## 📁 Project Structure

```
code-to-cloud/
├── app.py                  # Flask app entry point
├── backend/                # Core backend logic
│   ├── models/             # MongoDB models / schemas
│   ├── routes/             # Flask blueprints / route handlers
│   └── services/           # Business logic & service layer
├── controllers/            # Request handlers / controllers
├── middlewares/            # Custom middleware (auth, logging, etc.)
├── models/                 # Top-level shared models
├── routes/                 # Top-level route definitions
├── services/               # Top-level shared services
├── utils/                  # Utility / helper functions
├── static/                 # Static assets
│   ├── css/                # Stylesheets (Tailwind)
│   └── js/                 # JavaScript files
├── templates/              # Jinja2 HTML templates
│   ├── admin/              # Admin dashboard templates
│   └── vendor/             # Vendor-facing templates
├── requirements.txt        # Python dependencies
└── .env                    # Sample environment variables
```

---

## 🌐 Deployment

This app is deployed on **Render**. To deploy your own instance:

1. Push your code to GitHub.
2. Create a new **Web Service** on [Render](https://render.com).
3. Set the build command to `pip install -r requirements.txt` and start command to `flask run` (or `gunicorn app:app`).
4. Add your environment variables in the Render dashboard.

---

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request
