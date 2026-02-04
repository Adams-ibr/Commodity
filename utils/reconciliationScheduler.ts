/**
 * Reconciliation Scheduler Utility
 * Automatically runs daily reconciliation at configured time (default: 22:00)
 */

import { api } from '../services/api';
import { InventoryItem, Transaction, Reconciliation } from '../types';

interface SchedulerConfig {
    runTime: string; // HH:MM format, e.g., "22:00"
    enabled: boolean;
}

const SCHEDULER_CONFIG_KEY = 'reconciliation-scheduler-config';
const LAST_RUN_KEY = 'reconciliation-last-run';

class ReconciliationScheduler {
    private config: SchedulerConfig;
    private timeoutId: NodeJS.Timeout | null = null;
    private checkIntervalId: NodeJS.Timeout | null = null;

    constructor() {
        this.config = this.loadConfig();
    }

    /**
     * Load scheduler configuration from localStorage
     */
    private loadConfig(): SchedulerConfig {
        try {
            const saved = localStorage.getItem(SCHEDULER_CONFIG_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Error loading scheduler config:', e);
        }
        return {
            runTime: '22:00', // Default: 10 PM (end of business day)
            enabled: true
        };
    }

    /**
     * Save scheduler configuration to localStorage
     */
    private saveConfig(): void {
        try {
            localStorage.setItem(SCHEDULER_CONFIG_KEY, JSON.stringify(this.config));
        } catch (e) {
            console.warn('Error saving scheduler config:', e);
        }
    }

    /**
     * Get the last run date
     */
    private getLastRunDate(): string | null {
        return localStorage.getItem(LAST_RUN_KEY);
    }

    /**
     * Set the last run date
     */
    private setLastRunDate(date: string): void {
        localStorage.setItem(LAST_RUN_KEY, date);
    }

    /**
     * Check if reconciliation should run today
     */
    private shouldRunToday(): boolean {
        const today = new Date().toISOString().split('T')[0];
        const lastRun = this.getLastRunDate();
        return lastRun !== today;
    }

    /**
     * Calculate milliseconds until next run time
     */
    private getMillisecondsUntilRun(): number {
        const now = new Date();
        const [hours, minutes] = this.config.runTime.split(':').map(Number);

        const runTime = new Date(now);
        runTime.setHours(hours, minutes, 0, 0);

        // If run time has passed today, schedule for tomorrow
        if (runTime <= now) {
            runTime.setDate(runTime.getDate() + 1);
        }

        return runTime.getTime() - now.getTime();
    }

    /**
     * Start the scheduler
     */
    start(
        getInventory: () => InventoryItem[],
        getTransactions: () => Transaction[],
        getUserName: () => string,
        onReconciliationComplete?: (results: Reconciliation[]) => void
    ): void {
        if (!this.config.enabled) {
            console.log('[ReconciliationScheduler] Scheduler is disabled');
            return;
        }

        console.log('[ReconciliationScheduler] Starting scheduler, run time:', this.config.runTime);

        // Check if we missed today's run
        if (this.shouldRunToday()) {
            const now = new Date();
            const [hours, minutes] = this.config.runTime.split(':').map(Number);
            const runTimeToday = new Date(now);
            runTimeToday.setHours(hours, minutes, 0, 0);

            // If we're past run time and haven't run today, run now
            if (now > runTimeToday) {
                console.log('[ReconciliationScheduler] Missed today\'s run, running catch-up...');
                this.executeReconciliation(getInventory, getTransactions, getUserName, onReconciliationComplete);
            }
        }

        // Schedule next run
        this.scheduleNextRun(getInventory, getTransactions, getUserName, onReconciliationComplete);

        // Also set up a periodic check every hour (in case browser was suspended)
        this.checkIntervalId = setInterval(() => {
            if (this.shouldRunToday()) {
                const now = new Date();
                const [hours, minutes] = this.config.runTime.split(':').map(Number);
                const runTimeToday = new Date(now);
                runTimeToday.setHours(hours, minutes, 0, 0);

                if (now > runTimeToday) {
                    console.log('[ReconciliationScheduler] Detected missed run during interval check');
                    this.executeReconciliation(getInventory, getTransactions, getUserName, onReconciliationComplete);
                }
            }
        }, 60 * 60 * 1000); // Check every hour
    }

    /**
     * Schedule the next run
     */
    private scheduleNextRun(
        getInventory: () => InventoryItem[],
        getTransactions: () => Transaction[],
        getUserName: () => string,
        onReconciliationComplete?: (results: Reconciliation[]) => void
    ): void {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }

        const msUntilRun = this.getMillisecondsUntilRun();
        console.log(`[ReconciliationScheduler] Next run in ${Math.round(msUntilRun / 1000 / 60)} minutes`);

        this.timeoutId = setTimeout(() => {
            this.executeReconciliation(getInventory, getTransactions, getUserName, onReconciliationComplete);
            this.scheduleNextRun(getInventory, getTransactions, getUserName, onReconciliationComplete);
        }, msUntilRun);
    }

    /**
     * Execute the reconciliation
     */
    private async executeReconciliation(
        getInventory: () => InventoryItem[],
        getTransactions: () => Transaction[],
        getUserName: () => string,
        onReconciliationComplete?: (results: Reconciliation[]) => void
    ): Promise<void> {
        const today = new Date().toISOString().split('T')[0];

        try {
            console.log('[ReconciliationScheduler] Running automatic reconciliation...');

            const results = await api.reconciliations.runDailyReconciliation(
                getInventory(),
                getTransactions(),
                getUserName() || 'System (Auto)'
            );

            console.log(`[ReconciliationScheduler] Completed: ${results.length} records created`);
            this.setLastRunDate(today);

            if (onReconciliationComplete) {
                onReconciliationComplete(results);
            }
        } catch (error) {
            console.error('[ReconciliationScheduler] Error during automatic reconciliation:', error);
        }
    }

    /**
     * Stop the scheduler
     */
    stop(): void {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        if (this.checkIntervalId) {
            clearInterval(this.checkIntervalId);
            this.checkIntervalId = null;
        }
        console.log('[ReconciliationScheduler] Scheduler stopped');
    }

    /**
     * Update scheduler configuration
     */
    updateConfig(config: Partial<SchedulerConfig>): void {
        this.config = { ...this.config, ...config };
        this.saveConfig();
        console.log('[ReconciliationScheduler] Config updated:', this.config);
    }

    /**
     * Get current configuration
     */
    getConfig(): SchedulerConfig {
        return { ...this.config };
    }

    /**
     * Check if enabled
     */
    isEnabled(): boolean {
        return this.config.enabled;
    }
}

export const reconciliationScheduler = new ReconciliationScheduler();
export type { SchedulerConfig };
