
export const backupService = {
    async createBackup(userId: string) {
        try {
            const keysToBackup = ['theme', 'pos_printer_settings', 'notification_preferences', 'pos_pin_attempts'];
            const backupData: Record<string, any> = {
                timestamp: new Date().toISOString(),
                userId,
                data: {}
            };

            keysToBackup.forEach(key => {
                const value = localStorage.getItem(key);
                if (value) {
                    backupData.data[key] = value;
                }
            });

            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `backup-ze-entregas-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            return { success: true };
        } catch (error) {
            console.error('Backup failed:', error);
            throw new Error('Falha ao criar backup.');
        }
    },

    async restoreBackup(file: File): Promise<{ success: boolean; count: number }> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target?.result as string;
                    const parsed = JSON.parse(content);

                    if (!parsed.data || typeof parsed.data !== 'object') {
                        throw new Error('Arquivo de backup inválido.');
                    }

                    let count = 0;
                    Object.entries(parsed.data).forEach(([key, value]) => {
                        if (typeof value === 'string') {
                            localStorage.setItem(key, value);
                            count++;
                        }
                    });

                    resolve({ success: true, count });
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error('Erro ao ler arquivo.'));
            reader.readAsText(file);
        });
    }
};
