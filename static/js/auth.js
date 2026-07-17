/**
 * Authentication handling script (auth.js)
 */

document.addEventListener("DOMContentLoaded", () => {
    // ----------------------------------------------------
    // LOGIN FORM SUBMISSION
    // ----------------------------------------------------
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value;
            
            if (!email || !password) {
                showToast("Please fill in all fields.", "warning");
                return;
            }
            
            try {
                const res = await fetch("/api/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await res.json();
                
                if (res.status === 200) {
                    showToast("Login successful! Redirecting...", "success");
                    // Redirect based on role
                    setTimeout(() => {
                        const userRole = data.user.role;
                        if (userRole === "vendor") {
                            // If they have vendor/admin dashboards built
                            window.location.href = "/"; 
                        } else if (userRole === "admin") {
                            window.location.href = "/";
                        } else {
                            window.location.href = "/";
                        }
                    }, 1200);
                } else {
                    showToast(data.error || "Login failed. Please check credentials.", "danger");
                }
            } catch (err) {
                console.error("Login Error:", err);
                showToast("Network error. Please try again later.", "danger");
            }
        });
    }

    // ----------------------------------------------------
    // REGISTER FORM SUBMISSION
    // ----------------------------------------------------
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const fullName = document.getElementById("fullName").value.trim();
            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value;
            const phone = document.getElementById("phone").value.trim();
            const address = document.getElementById("address").value.trim();
            const role = document.getElementById("role") ? document.getElementById("role").value : "customer";
            
            if (!fullName || !email || !password || !phone || !address) {
                showToast("All fields are required.", "warning");
                return;
            }
            
            if (password.length < 6) {
                showToast("Password must be at least 6 characters.", "warning");
                return;
            }
            
            try {
                const res = await fetch("/api/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fullName, email, password, phone, address, role })
                });
                
                const data = await res.json();
                
                if (res.status === 201) {
                    showToast("Registration successful! Logging in...", "success");
                    
                    // Auto-login customer after registration
                    const loginRes = await fetch("/api/login", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email, password })
                    });
                    
                    if (loginRes.status === 200) {
                        setTimeout(() => {
                            window.location.href = "/";
                        }, 1200);
                    } else {
                        setTimeout(() => {
                            window.location.href = "/login";
                        }, 1200);
                    }
                } else {
                    showToast(data.error || "Registration failed.", "danger");
                }
            } catch (err) {
                console.error("Registration Error:", err);
                showToast("Network error. Please try again.", "danger");
            }
        });
    }
});
