class PasswordGenerator {
    constructor() {
        this.initElements();
        this.initEventListeners();
        this.generatedPasswords = [];
    }

    initElements() {
        this.lengthSlider = document.getElementById('length');
        this.lengthValue = document.getElementById('lengthValue');
        this.countInput = document.getElementById('count');
        this.lowercaseCheck = document.getElementById('lowercase');
        this.uppercaseCheck = document.getElementById('uppercase');
        this.numbersCheck = document.getElementById('numbers');
        this.symbolsCheck = document.getElementById('symbols');
        this.generateBtn = document.getElementById('generateBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.resultsSection = document.getElementById('resultsSection');
        this.passwordsList = document.getElementById('passwordsList');
    }

    initEventListeners() {
        this.lengthSlider.addEventListener('input', () => {
            this.lengthValue.textContent = this.lengthSlider.value;
        });

        this.generateBtn.addEventListener('click', () => this.generatePasswords());
        this.downloadBtn.addEventListener('click', () => this.downloadCSV());
        this.clearBtn.addEventListener('click', () => this.clearResults());
    }

    async generatePasswords() {
        const options = {
            length: parseInt(this.lengthSlider.value),
            includeLowercase: this.lowercaseCheck.checked,
            includeUppercase: this.uppercaseCheck.checked,
            includeNumbers: this.numbersCheck.checked,
            includeSymbols: this.symbolsCheck.checked
        };

        const count = parseInt(this.countInput.value);

        if (!options.includeLowercase && !options.includeUppercase && 
            !options.includeNumbers && !options.includeSymbols) {
            alert('Seleziona almeno un tipo di carattere!');
            return;
        }

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ...options, count })
            });

            const passwords = await response.json();
            this.generatedPasswords = passwords;
            this.displayPasswords();
        } catch (error) {
            alert('Errore nella generazione delle password');
        }
    }

    displayPasswords() {
        this.passwordsList.innerHTML = '';
        
        this.generatedPasswords.forEach((item, index) => {
            const passwordDiv = document.createElement('div');
            passwordDiv.className = 'password-item';
            passwordDiv.innerHTML = `
                <span class="password-text">${item.password}</span>
                <button class="copy-btn" onclick="passwordGen.copyToClipboard('${item.password}', ${index})">
                    Copia
                </button>
            `;
            this.passwordsList.appendChild(passwordDiv);
        });

        this.resultsSection.style.display = 'block';
    }

    copyToClipboard(password, index) {
        navigator.clipboard.writeText(password).then(() => {
            const btn = document.querySelectorAll('.copy-btn')[index];
            const originalText = btn.textContent;
            btn.textContent = 'Copiato!';
            btn.style.background = '#28a745';
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '#007bff';
            }, 1000);
        });
    }

    async downloadCSV() {
        if (this.generatedPasswords.length === 0) {
            alert('Nessuna password da scaricare!');
            return;
        }

        try {
            const response = await fetch('/api/download-csv', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ passwords: this.generatedPasswords })
            });

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'passwords.csv';
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            alert('Errore nel download del CSV');
        }
    }

    clearResults() {
        this.generatedPasswords = [];
        this.passwordsList.innerHTML = '';
        this.resultsSection.style.display = 'none';
    }
}

// Inizializza l'applicazione
const passwordGen = new PasswordGenerator();
