class VSPhoneDashboard {
    constructor() {
        this.instances = [];
        this.selectedInstances = new Set();
        this.init();
    }

    async init() {
        await this.loadInstances();
        this.setupEventListeners();
    }

    async loadInstances() {
        try {
            const response = await fetch('/api/instances');
            const data = await response.json();
            
            if (data.code === 200) {
                this.instances = data.data.pageData || [];
                this.renderInstances();
                this.updateStats();
            } else {
                throw new Error(data.msg || 'Failed to load instances');
            }
        } catch (error) {
            this.showError('Failed to load instances: ' + error.message);
        }
    }

    renderInstances() {
        const container = document.getElementById('instances-list');
        
        if (this.instances.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center">
                    <p class="text-muted">No instances found</p>
                    <button class="btn btn-primary" onclick="createNewInstance()">
                        <i class="fas fa-plus"></i> Create First Instance
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = this.instances.map(instance => `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card instance-card ${instance.padStatus === 10 ? 'border-success' : 'border-warning'}">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <div>
                            <input type="checkbox" class="form-check-input instance-checkbox" 
                                   value="${instance.padCode}" onchange="toggleInstanceSelection('${instance.padCode}')">
                            <strong>${instance.padCode}</strong>
                        </div>
                        <span class="badge ${instance.padStatus === 10 ? 'bg-success' : 'bg-warning'}">
                            ${this.getStatusText(instance.padStatus)}
                        </span>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-12 mb-2">
                                <small class="text-muted">IP: ${instance.padIp || 'N/A'}</small>
                            </div>
                            <div class="col-12 mb-2">
                                <small class="text-muted">Grade: ${instance.padGrade || 'N/A'}</small>
                            </div>
                        </div>
                        <div class="btn-group w-100">
                            <button class="btn btn-sm btn-outline-primary" onclick="showInstanceActions('${instance.padCode}')">
                                <i class="fas fa-cog"></i> Actions
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="restartInstance('${instance.padCode}')">
                                <i class="fas fa-redo"></i> Restart
                            </button>
                            <button class="btn btn-sm btn-outline-info" onclick="takeScreenshot('${instance.padCode}')">
                                <i class="fas fa-camera"></i> Screenshot
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    getStatusText(status) {
        const statusMap = {
            10: 'Online',
            11: 'Restarting',
            12: 'Resetting',
            13: 'Upgrading',
            14: 'Abnormal',
            15: 'Not Ready',
            100: 'Normal',
            102: 'Rebooting',
            103: 'Resetting'
        };
        return statusMap[status] || `Status: ${status}`;
    }

    updateStats() {
        document.getElementById('total-instances').textContent = this.instances.length;
        document.getElementById('online-instances').textContent = 
            this.instances.filter(i => i.padStatus === 10 || i.padStatus === 100).length;
        document.getElementById('offline-instances').textContent = 
            this.instances.filter(i => i.padStatus !== 10 && i.padStatus !== 100).length;
    }

    setupEventListeners() {
        // Auto-refresh every 30 seconds
        setInterval(() => this.loadInstances(), 30000);
    }

    showError(message) {
        // Simple error display - bisa diganti dengan toast notification
        alert('Error: ' + message);
    }
}

// Global functions for HTML onclick events
let dashboard;

async function refreshInstances() {
    await dashboard.loadInstances();
}

async function createNewInstance() {
    try {
        const response = await fetch('/api/instances/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                androidVersion: 'Android13',
                goodId: 1
            })
        });
        
        const result = await response.json();
        
        if (result.code === 200) {
            alert('Instance creation initiated!');
            await refreshInstances();
        } else {
            throw new Error(result.msg || 'Creation failed');
        }
    } catch (error) {
        alert('Failed to create instance: ' + error.message);
    }
}

async function restartInstance(padCode) {
    if (!confirm(`Restart instance ${padCode}?`)) return;
    
    try {
        const response = await fetch('/api/instances/restart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ padCodes: [padCode] })
        });
        
        const result = await response.json();
        
        if (result.code === 200) {
            alert('Restart command sent!');
            await refreshInstances();
        } else {
            throw new Error(result.msg || 'Restart failed');
        }
    } catch (error) {
        alert('Failed to restart: ' + error.message);
    }
}

function showInstanceActions(padCode) {
    const modal = new bootstrap.Modal(document.getElementById('actionsModal'));
    const modalContent = document.getElementById('modal-content');
    
    modalContent.innerHTML = `
        <h6>Actions for ${padCode}</h6>
        <div class="row g-2">
            <div class="col-md-6">
                <button class="btn btn-outline-primary w-100" onclick="executeCommandModal('${padCode}')">
                    <i class="fas fa-terminal"></i> ADB Command
                </button>
            </div>
            <div class="col-md-6">
                <button class="btn btn-outline-success w-100" onclick="uploadFileModal('${padCode}')">
                    <i class="fas fa-upload"></i> Upload File
                </button>
            </div>
            <div class="col-md-6">
                <button class="btn btn-outline-warning w-100" onclick="oneClickNewDevice('${padCode}')">
                    <i class="fas fa-sync"></i> One-Click New Device
                </button>
            </div>
            <div class="col-md-6">
                <button class="btn btn-outline-info w-100" onclick="takeScreenshot('${padCode}')">
                    <i class="fas fa-camera"></i> Take Screenshot
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('modalTitle').textContent = `Actions - ${padCode}`;
    modal.show();
}

async function executeCommandModal(padCode) {
    const command = prompt('Enter ADB command:');
    if (!command) return;
    
    try {
        const response = await fetch('/api/instances/command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ padCode, command })
        });
        
        const result = await response.json();
        alert('Command executed! Task ID: ' + (result.data?.[0]?.taskId || 'Unknown'));
    } catch (error) {
        alert('Failed to execute command: ' + error.message);
    }
}

async function takeScreenshot(padCode) {
    try {
        const response = await fetch('/api/instances/screenshot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ padCodes: [padCode] })
        });
        
        const result = await response.json();
        
        if (result.code === 200 && result.data?.[0]?.accessUrl) {
            window.open(result.data[0].accessUrl, '_blank');
        } else {
            throw new Error('Screenshot failed');
        }
    } catch (error) {
        alert('Failed to take screenshot: ' + error.message);
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new VSPhoneDashboard();
});