

const { useState, useEffect, useMemo } = React;

// ================================================
// Configuration Constants
// ================================================

const CONFIG = {
    API_BASE_URL: 'http://localhost:3000/api',
    REFRESH_INTERVAL: 3000, // Refresh every 3 seconds for real-time updates
    ANIMATION_DELAY_INCREMENT: 50, // ms between card animations
};

// ================================================
// Main Dashboard Component
// ================================================

const Dashboard = () => {
    // ============================================
    // State Management
    // ============================================
    
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastFetchTime, setLastFetchTime] = useState(null);
    const [filters, setFilters] = useState({
        severity: 'all',
        status: 'all',
        category: 'all',
        search: ''
    });

    // ============================================
    // Data Fetching
    // ============================================
    
    /**
     * Fetch alerts from the backend API
     * This gets REAL alerts created by AlertManager
     */
    const fetchAlerts = async () => {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/alerts`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Ensure data is an array
            const alertsArray = Array.isArray(data) ? data : [];
            
            setAlerts(alertsArray);
            setError(null);
            setLastFetchTime(new Date());
            
            console.log(`✅ Fetched ${alertsArray.length} alerts from backend`);
        } catch (err) {
            console.error('❌ Error fetching alerts from backend:', err);
            setError(err.message);
            
            // Keep existing alerts on error (don't clear them)
            // This way if backend is temporarily down, we still show data
        } finally {
            setLoading(false);
        }
    };

    // ============================================
    // Effects
    // ============================================
    
    /**
     * Initial data load and periodic refresh
     * This ensures we always have the latest alerts from the backend
     */
    useEffect(() => {
        console.log('🚀 Dashboard initialized - connecting to backend...');
        fetchAlerts();
        
        // Set up auto-refresh to get new alerts automatically
        const interval = setInterval(() => {
            console.log('🔄 Auto-refreshing alerts from backend...');
            fetchAlerts();
        }, CONFIG.REFRESH_INTERVAL);
        
        return () => clearInterval(interval);
    }, []);

    // ============================================
    // Computed Values
    // ============================================
    
    /**
     * Filter alerts based on current filter criteria
     */
    const filteredAlerts = useMemo(() => {
        return alerts.filter(alert => {
            // Severity filter
            const matchesSeverity = filters.severity === 'all' || 
                alert.severity.toLowerCase() === filters.severity.toLowerCase();
            
            // Status filter (handle "In-Progress" case)
            const normalizedStatus = alert.status.toLowerCase().replace(/-/g, '');
            const matchesStatus = filters.status === 'all' || 
                normalizedStatus === filters.status.toLowerCase().replace(/-/g, '');
            
            // Category filter
            const matchesCategory = filters.category === 'all' || 
                alert.category.toLowerCase() === filters.category.toLowerCase();
            
            // Search filter (searches in description and ID)
            const searchLower = filters.search.toLowerCase();
            const matchesSearch = !filters.search || 
                alert.description.toLowerCase().includes(searchLower) ||
                alert.id.toLowerCase().includes(searchLower);

            return matchesSeverity && matchesStatus && matchesCategory && matchesSearch;
        });
    }, [alerts, filters]);

    /**
     * Calculate statistics for stat cards
     */
    const statistics = useMemo(() => {
        return {
            new: alerts.filter(a => a.status === 'New').length,
            acknowledged: alerts.filter(a => a.status === 'Acknowledged').length,
            inProgress: alerts.filter(a => a.status === 'In-Progress').length,
            resolved: alerts.filter(a => a.status === 'Resolved').length,
            total: alerts.length
        };
    }, [alerts]);

    /**
     * Calculate category counts for display
     */
    const categoryCounts = useMemo(() => {
        return {
            CVE: alerts.filter(a => a.category === 'CVE').length,
            S3: alerts.filter(a => a.category === 'S3').length,
            IAM: alerts.filter(a => a.category === 'IAM').length,
            Network: alerts.filter(a => a.category === 'Network').length,
            Activity: alerts.filter(a => a.category === 'Activity').length
        };
    }, [alerts]);

    // ============================================
    // Event Handlers
    // ============================================
    
    /**
     * Handle filter changes
     */
    const handleFilterChange = (filterType, value) => {
        setFilters(prev => ({
            ...prev,
            [filterType]: value
        }));
    };

    /**
     * Handle alert status update
     * Calls AlertManager.updateAlertStatus()
     */
    const handleStatusUpdate = async (alertId, newStatus) => {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/alerts/${alertId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) {
                throw new Error('Failed to update alert status');
            }

            // Optimistic UI update
            setAlerts(prev => prev.map(alert =>
                alert.id === alertId 
                    ? { ...alert, status: newStatus } 
                    : alert
            ));

            console.log(`✅ Alert ${alertId} status updated to ${newStatus}`);
        } catch (err) {
            console.error('❌ Error updating status:', err);
            alert('Failed to update alert status. Please try again.');
        }
    };

    /**
     * Manual refresh button
     */
    const handleManualRefresh = () => {
        setLoading(true);
        fetchAlerts();
    };

    // ============================================
    // Render
    // ============================================
    
    return (
        <div className="dashboard-container">
            <Header 
                onRefresh={handleManualRefresh}
                loading={loading}
                lastFetchTime={lastFetchTime}
                totalAlerts={alerts.length}
            />
            
            <StatsGrid statistics={statistics} />
            
            <CategoryBreakdown categoryCounts={categoryCounts} />
            
            {alerts.length > 0 && (
                <FiltersSection 
                    filters={filters} 
                    onFilterChange={handleFilterChange} 
                />
            )}
            
            <AlertsSection
                alerts={filteredAlerts}
                totalAlerts={alerts.length}
                loading={loading}
                error={error}
                onStatusUpdate={handleStatusUpdate}
            />
        </div>
    );
};

// ================================================
// Header Component
// ================================================

const Header = ({ onRefresh, loading, lastFetchTime, totalAlerts }) => (
    <header className="dashboard-header">
        <div className="header-content">
            <div className="header-title-section">
                <h1 className="header-title">
                    <span role="img" aria-label="Shield">🛡️</span>
                    CloudGuard Dashboard
                </h1>
                <p className="header-subtitle">
                    Alert Management System - Real-time Security Monitoring
                </p>
                {lastFetchTime && (
                    <p className="header-status">
                        <span className="status-indicator"></span>
                        Connected • {totalAlerts} total alerts • Last updated: {lastFetchTime.toLocaleTimeString()}
                    </p>
                )}
            </div>
            <div className="header-actions">
                <button 
                    className="btn btn-outline" 
                    onClick={onRefresh}
                    disabled={loading}
                    aria-label="Refresh alerts"
                >
                    <span role="img" aria-label="Refresh">🔄</span>
                    {loading ? 'Refreshing...' : 'Refresh Now'}
                </button>
            </div>
        </div>
    </header>
);

// ================================================
// Stats Grid Component
// ================================================

const StatsGrid = ({ statistics }) => {
    const statCards = [
        {
            label: 'New Alerts',
            value: statistics.new,
            icon: '🆕',
            className: 'new',
            trend: { value: statistics.new > 0 ? '+' + statistics.new : '0', direction: statistics.new > 0 ? 'up' : 'down' }
        },
        {
            label: 'Acknowledged',
            value: statistics.acknowledged,
            icon: '👁️',
            className: 'acknowledged',
            trend: { value: statistics.acknowledged > 0 ? '+' + statistics.acknowledged : '0', direction: statistics.acknowledged > 0 ? 'up' : 'down' }
        },
        {
            label: 'In Progress',
            value: statistics.inProgress,
            icon: '⚙️',
            className: 'inprogress',
            trend: { value: statistics.inProgress > 0 ? '' + statistics.inProgress : '0', direction: statistics.inProgress > 2 ? 'up' : 'down' }
        },
        {
            label: 'Resolved',
            value: statistics.resolved,
            icon: '✅',
            className: 'resolved',
            trend: { value: statistics.resolved > 0 ? '+' + statistics.resolved : '0', direction: statistics.resolved > 0 ? 'up' : 'down' }
        }
    ];

    return (
        <div className="stats-grid">
            {statCards.map((stat, index) => (
                <StatCard key={index} {...stat} />
            ))}
        </div>
    );
};

// ================================================
// Stat Card Component
// ================================================

const StatCard = ({ label, value, icon, className, trend }) => (
    <div className={`stat-card ${className}`} role="article">
        <div className="stat-header">
            <div className="stat-icon" role="img" aria-label={label}>
                {icon}
            </div>
            <div className={`stat-trend ${trend.direction}`}>
                {trend.direction === 'up' ? '↑' : '↓'} {trend.value}
            </div>
        </div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
    </div>
);

// ================================================
// Category Breakdown Component
// ================================================

const CategoryBreakdown = ({ categoryCounts }) => {
    const categories = [
        { name: 'CVE', icon: '🔒', count: categoryCounts.CVE, color: 'danger' },
        { name: 'S3', icon: '🪣', count: categoryCounts.S3, color: 'warning' },
        { name: 'IAM', icon: '👤', count: categoryCounts.IAM, color: 'primary' },
        { name: 'Network', icon: '🌐', count: categoryCounts.Network, color: 'secondary' },
        { name: 'Activity', icon: '📈', count: categoryCounts.Activity, color: 'success' }
    ];

    const totalCategories = categories.reduce((sum, cat) => sum + cat.count, 0);

    if (totalCategories === 0) return null;

    return (
        <section className="category-breakdown">
            <h2 className="section-title">📊 Category Breakdown</h2>
            <div className="category-grid">
                {categories.map(category => (
                    <div key={category.name} className={`category-card ${category.color}`}>
                        <div className="category-icon">{category.icon}</div>
                        <div className="category-name">{category.name}</div>
                        <div className="category-count">{category.count}</div>
                    </div>
                ))}
            </div>
        </section>
    );
};

// ================================================
// Filters Section Component
// ================================================

const FiltersSection = ({ filters, onFilterChange }) => (
    <section className="filters-section" aria-label="Alert filters">
        <div className="filters-row">
            <div className="filter-group">
                <label htmlFor="severity-filter" className="filter-label">
                    Severity
                </label>
                <select
                    id="severity-filter"
                    className="filter-select"
                    value={filters.severity}
                    onChange={(e) => onFilterChange('severity', e.target.value)}
                >
                    <option value="all">All Severities</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                </select>
            </div>

            <div className="filter-group">
                <label htmlFor="status-filter" className="filter-label">
                    Status
                </label>
                <select
                    id="status-filter"
                    className="filter-select"
                    value={filters.status}
                    onChange={(e) => onFilterChange('status', e.target.value)}
                >
                    <option value="all">All Statuses</option>
                    <option value="new">New</option>
                    <option value="acknowledged">Acknowledged</option>
                    <option value="inprogress">In Progress</option>
                    <option value="resolved">Resolved</option>
                </select>
            </div>

            <div className="filter-group">
                <label htmlFor="category-filter" className="filter-label">
                    Category
                </label>
                <select
                    id="category-filter"
                    className="filter-select"
                    value={filters.category}
                    onChange={(e) => onFilterChange('category', e.target.value)}
                >
                    <option value="all">All Categories</option>
                    <option value="iam">IAM</option>
                    <option value="s3">S3</option>
                    <option value="network">Network</option>
                    <option value="activity">Activity</option>
                    <option value="cve">CVE</option>
                </select>
            </div>

            <div className="filter-group">
                <label htmlFor="search-filter" className="filter-label">
                    Search
                </label>
                <input
                    id="search-filter"
                    type="text"
                    className="filter-input"
                    placeholder="Search alerts..."
                    value={filters.search}
                    onChange={(e) => onFilterChange('search', e.target.value)}
                />
            </div>
        </div>
    </section>
);

// ================================================
// Alerts Section Component
// ================================================

const AlertsSection = ({ alerts, totalAlerts, loading, error, onStatusUpdate }) => (
    <section className="alerts-section" aria-label="Alerts list">
        <div className="alerts-header">
            <h2 className="alerts-title">
                🚨 Active Alerts
                <span className="alerts-count">{alerts.length}</span>
            </h2>
        </div>

        {loading && totalAlerts === 0 ? (
            <LoadingState />
        ) : error && totalAlerts === 0 ? (
            <ErrorState error={error} />
        ) : totalAlerts === 0 ? (
            <EmptyStateNoAlerts />
        ) : alerts.length === 0 ? (
            <EmptyStateFiltered />
        ) : (
            <div className="alerts-grid">
                {alerts.map((alert, index) => (
                    <AlertCard
                        key={alert.id}
                        alert={alert}
                        index={index}
                        onStatusUpdate={onStatusUpdate}
                    />
                ))}
            </div>
        )}
    </section>
);

// ================================================
// Alert Card Component
// ================================================

const AlertCard = ({ alert, index, onStatusUpdate }) => {
    /**
     * Get next valid status based on current status
     * Implements state transition logic from LLD:
     * New → Acknowledged → In-Progress → Resolved
     */
    const getNextStatus = (currentStatus) => {
        const transitions = {
            'New': 'Acknowledged',
            'Acknowledged': 'In-Progress',
            'In-Progress': 'Resolved',
            'Resolved': null
        };
        return transitions[currentStatus];
    };

    /**
     * Format timestamp for display
     */
    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const nextStatus = getNextStatus(alert.status);
    const canTransition = nextStatus !== null;

    return (
        <article 
            className={`alert-card severity-${alert.severity.toLowerCase()}`}
            style={{ animationDelay: `${index * CONFIG.ANIMATION_DELAY_INCREMENT}ms` }}
        >
            <div className="alert-header">
                <div>
                    <span className="alert-id">{alert.id}</span>
                    <span className="alert-category">{alert.category}</span>
                </div>
                <div className="alert-badges">
                    <span 
                        className={`badge badge-severity ${alert.severity.toLowerCase()}`}
                        role="status"
                        aria-label={`Severity: ${alert.severity}`}
                    >
                        {alert.severity}
                    </span>
                    <span 
                        className={`badge badge-status ${alert.status.toLowerCase().replace('-', '')}`}
                        role="status"
                        aria-label={`Status: ${alert.status}`}
                    >
                        {alert.status}
                    </span>
                </div>
            </div>

            <p className="alert-description">{alert.description}</p>

            <div className="alert-footer">
                <span className="alert-timestamp">
                    <span role="img" aria-label="Time">🕒</span>
                    {formatTimestamp(alert.timestamp)}
                </span>
                {canTransition && (
                    <div className="alert-actions">
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={() => onStatusUpdate(alert.id, nextStatus)}
                            aria-label={`Mark alert as ${nextStatus}`}
                        >
                            Mark as {nextStatus}
                        </button>
                    </div>
                )}
            </div>
        </article>
    );
};

// ================================================
// Loading State Component
// ================================================

const LoadingState = () => (
    <div className="empty-state" role="status" aria-live="polite">
        <div className="loading-spinner" aria-hidden="true"></div>
        <p className="empty-state-text">Connecting to backend and loading alerts...</p>
    </div>
);

// ================================================
// Error State Component
// ================================================

const ErrorState = ({ error }) => (
    <div className="empty-state" role="alert">
        <div className="empty-state-icon" aria-hidden="true">⚠️</div>
        <h3 className="empty-state-title">Cannot Connect to Backend</h3>
        <p className="empty-state-text">
            {error || 'Unable to connect to the CloudGuard backend server.'}<br/>
            Please ensure the server is running on <strong>http://localhost:3000</strong>
        </p>
    </div>
);

// ================================================
// Empty State Component - No Alerts Created
// ================================================

const EmptyStateNoAlerts = () => (
    <div className="empty-state">
        <div className="empty-state-icon" aria-hidden="true">✅</div>
        <h3 className="empty-state-title">No Security Alerts</h3>
        <p className="empty-state-text">
            Your system is secure! No security alerts have been detected by the monitoring engines.<br/>
            <strong>Monitoring Active:</strong> RuleEngine, AnomalyEngine, CVE Scanner, S3 Checks, IAM Policy Monitor
        </p>
    </div>
);

// ================================================
// Empty State Component - Filtered
// ================================================

const EmptyStateFiltered = () => (
    <div className="empty-state">
        <div className="empty-state-icon" aria-hidden="true">🔍</div>
        <h3 className="empty-state-title">No Matching Alerts</h3>
        <p className="empty-state-text">
            No alerts match your current filters.
            Try adjusting your search criteria or clearing the filters.
        </p>
    </div>
);

// ================================================
// Application Initialization
// ================================================

/**
 * Render the Dashboard application to the DOM
 */
const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);
root.render(<Dashboard />);