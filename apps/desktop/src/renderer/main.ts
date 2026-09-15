// Tipagem do bridge exposto em preload/index.ts
declare global {
  interface Window {
    zapmirror: {
      checkLicense: () => Promise<{ status: string; allowed: boolean }>;
      listDevices: () => Promise<{ serial: string; state: string; model?: string }[]>;
    };
  }
}

async function render() {
  const licenseEl = document.getElementById('license-status')!;
  const devicesEl = document.getElementById('devices')!;

  const license = await window.zapmirror.checkLicense();
  licenseEl.textContent = license.allowed
    ? `Licença: ${license.status}`
    : `Sem licença ativa (${license.status}) — espelhamento bloqueado`;

  const devices = await window.zapmirror.listDevices();
  devicesEl.innerHTML = devices.length
    ? devices
        .map(
          (d) =>
            `<div class="device">${d.model ?? d.serial} — ${d.state}</div>`,
        )
        .join('')
    : 'Nenhum dispositivo detectado ainda. Conecte um Android por USB e autorize a depuração no aparelho.';
}

render();
