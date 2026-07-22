import { FALLBACK_CHAINS, FALLBACK_CHAIN_HISTORY } from '../lib/fallback-chain-data.js';

export class FallbackChainViewer {
  constructor() {
    this.overlay = null;
  }

  generateText() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const jstStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    
    let text = `=== AI Model Fallback Chain (${jstStr} JST) ===\n`;
    text += `Each provider falls back only within its own provider family. Gemini never calls OpenAI, and OpenAI never calls Gemini.\n\n`;

    const steps = [];
    FALLBACK_CHAINS.forEach(chain => steps.push(chain));

    steps.forEach(chain => {
      text += `--- [${chain.provider} only] ${chain.step}: ${chain.label} ---\n`;
      text += `${chain.description}\n`;
      text += `  Source: ${chain.sourceFile}\n`;
      chain.models.forEach((model, index) => {
        text += `  ${index + 1}. ${model.id} - ${model.label}\n`;
      });
      text += '\n';
    });

    text += '=== Update History ===\n\n';

    FALLBACK_CHAIN_HISTORY.forEach(history => {
      text += `[v${history.version}] ${history.date}\n`;
      text += `${history.note}\n`;
      history.changes.forEach(change => {
        text += `  構成 | ${change.step} -> ${change.detail}\n`;
      });
      text += '\n';
    });

    return text.trim();
  }

  open() {
    if (this.overlay) return;

    this.overlay = document.createElement('div');
    this.overlay.className = 'fallback-chain-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'fallback-chain-modal';

    const header = document.createElement('div');
    header.className = 'fallback-chain-header';

    const title = document.createElement('h3');
    title.textContent = '⚙ Model Fallback Chain';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'fallback-chain-close';
    closeBtn.textContent = '✕';
    closeBtn.onclick = () => this.close();

    header.appendChild(title);
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'fallback-chain-body';

    const pre = document.createElement('pre');
    pre.className = 'fallback-chain-pre';
    const textContent = this.generateText();
    pre.textContent = textContent;
    body.appendChild(pre);

    const footer = document.createElement('div');
    footer.className = 'fallback-chain-footer';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'fallback-chain-copy-btn';
    copyBtn.textContent = '📋 Copy to Clipboard';
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(textContent).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✅ Copied!';
        setTimeout(() => {
          copyBtn.textContent = originalText;
        }, 2000);
      });
    };

    footer.appendChild(copyBtn);

    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);

    this.overlay.appendChild(modal);
    document.body.appendChild(this.overlay);

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    this.keydownHandler = (e) => {
      if (e.key === 'Escape') this.close();
    };
    document.addEventListener('keydown', this.keydownHandler);
  }

  close() {
    if (this.overlay) {
      document.body.removeChild(this.overlay);
      this.overlay = null;
    }
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }
  }
}
