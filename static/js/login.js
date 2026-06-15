// static/js/login.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorBox = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const loginBtn = document.getElementById('loginBtn');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        
        // 1. Set Loading UI
        const originalBtnHtml = loginBtn.innerHTML;
        loginBtn.innerHTML = '<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Authenticating...';
        loginBtn.disabled = true;
        loginBtn.classList.add('opacity-80', 'cursor-not-allowed');
        errorBox.classList.add('hidden');

        // 2. Gather Data
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        // 3. Fire the secure Fetch API call
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Success! Redirect to the main dashboard
                loginBtn.innerHTML = 'Success! Redirecting...';
                loginBtn.classList.replace('bg-blue-600', 'bg-green-500');
                loginBtn.classList.replace('hover:bg-blue-700', 'hover:bg-green-600');
                
                // Add a tiny delay for a smooth UX transition
                setTimeout(() => {
                    window.location.href = '/'; 
                }, 400);

            } else {
                // Display specific error from Flask backend
                showError(data.error || 'Invalid credentials provided.');
                resetButton(originalBtnHtml);
            }
        } catch (error) {
            console.error('Login Fetch Error:', error);
            showError('Network connectivity error. Is the local server running?');
            resetButton(originalBtnHtml);
        }
    });

    // --- Helpers ---
    function showError(message) {
        errorText.textContent = message;
        errorBox.classList.remove('hidden');
        // Shake animation for error
        errorBox.classList.add('animate-bounce');
        setTimeout(() => errorBox.classList.remove('animate-bounce'), 500);
    }

    function resetButton(html) {
        loginBtn.innerHTML = html;
        loginBtn.disabled = false;
        loginBtn.classList.remove('opacity-80', 'cursor-not-allowed');
    }
});