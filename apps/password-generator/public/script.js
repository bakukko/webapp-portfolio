class PasswordGenerator {
    constructor() {
        this.initElements();
        this.initEventListeners();
    }

    initElements() {
        this.lengthSlider = document.getElementById('length');
        this.lengthValue = document.getElementById('lengthValue');
        this.countInput = document.getElementById('count');
        this.prefixInput = document.getElementById('prefix');
        this.lowercaseCheck = document.getElementById('lowercase');
        this.uppercaseCheck = document.getElementById('uppercase');
        this.numbersCheck = document.getElementById('numbers');
        this.symbolsCheck = document.getElementById('symbols');
        this.excludeAmbiguousCheck = document.getElementById('excludeAmbiguous');
        this.generateBtn = document.getElementById('generateBtn');
    }

    initEventListeners() {
        this.lengthSlider.addEventListener('input', () => {
            this.lengthValue.textContent = this.lengthSlider.value;
        });

        this.generateBtn.addEventListener('click', () => this.generateAndDownload());
        
        // Validazione in tempo reale
        this.prefixInput.addEventListener('input', () => this.validateForm());
        this.lengthSlider.addEventListener('input', () => this.validateForm());
    }

    validateForm() {
        const prefixLength = this.prefixInput.value.length;
        const totalLength = parseInt(this.lengthSlider.value);
        
        if (prefixLength >= totalLength) {
            this.generateBtn.disabled = true;
            this.generateBtn.textContent = 'Prefisso troppo lungo';
        } else {
            this.generateBtn.disabled = false;
            this.generateBtn.textContent = 'Genera e Scarica CSV';
        }
    }

    async generateAndDownload() {
        const options = {
            length: parseInt(this.lengthSlider.value),
            count: parseInt(this.countInput.value),
            prefix: this.prefixInput.value.trim(),
            includeLowercase: this.lowercaseCheck.checked,
            includeUppercase: this.uppercaseCheck.checked,
            includeNumbers: this.numbersCheck.checked,
            includeSymbols: this.symbolsCheck.checked,
            excludeAmbiguous: this.excludeAmbiguousCheck.checked
        };

        // Validazioni
        if (!options.includeLowercase && !options.includeUppercase && 
            !options.includeNumbers && !options.includeSymbols) {
            alert('Seleziona almeno un tipo di carattere!');
            return;
        }

        if (options.prefix.length >= options.length) {
            alert('Il prefisso è troppo lungo rispetto alla lunghezza della password!');
            return;
        }

        if (options.count > 10000) {
            alert('Massimo 10.000 password per volta!');
            return;
        }

        try {
            this.generateBtn.disabled = true;
            this.generateBtn.textContent = 'Generazione in corso...';

            const response = await fetch('/api/generate-csv', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(options)
            });

            if (!response.ok) {
                throw new Error('Errore del server');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `passwords_${new Date().getTime()}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            // Feedback successo
            this.generateBtn.textContent = 'Download completato!';
            this.generateBtn.style.background = '#28a745';
            
            setTimeout(() => {
                this.generateBtn.textContent = 'Genera e Scarica CSV';
                this.generateBtn.style.background = '';
                this.generateBtn.disabled = false;
            }, 2000);

        } catch (error) {
            alert('Errore nella generazione delle password: ' + error.message);
            this.generateBtn.disabled = false;
            this.generateBtn.textContent = 'Genera e Scarica CSV';
        }
    }
}

// Inizializza l'applicazione
const passwordGen = new PasswordGenerator();
