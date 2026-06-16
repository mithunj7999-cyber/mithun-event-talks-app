// Application State
let appData = {
    releases: [],
    selectedUpdate: null,
    activeFilter: 'all',
    searchQuery: ''
};

// DOM Elements
const DOM = {
    btnRefresh: document.getElementById('btn-refresh'),
    spinner: document.getElementById('spinner'),
    valTotalReleases: document.getElementById('val-total-releases'),
    valFeatures: document.getElementById('val-features'),
    valIssues: document.getElementById('val-issues'),
    valChanges: document.getElementById('val-changes'),
    inputSearch: document.getElementById('input-search'),
    filterBtns: document.querySelectorAll('.filter-btn'),
    loadingIndicator: document.getElementById('loading-indicator'),
    errorDisplay: document.getElementById('error-display'),
    errorMessage: document.getElementById('error-message'),
    btnRetry: document.getElementById('btn-retry'),
    releasesTimeline: document.getElementById('releases-timeline'),
    noResultsIndicator: document.getElementById('no-results-indicator'),
    
    // Composer elements
    composerTip: document.getElementById('composer-tip'),
    composerInputsWrapper: document.getElementById('composer-inputs-wrapper'),
    composerStatus: document.getElementById('composer-status'),
    tweetText: document.getElementById('tweet-text'),
    charCount: document.getElementById('char-count'),
    composerCharWarning: document.getElementById('composer-char-warning'),
    btnTweet: document.getElementById('btn-tweet'),
    btnCopy: document.getElementById('btn-copy')
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    fetchReleases();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // Refresh Button
    DOM.btnRefresh.addEventListener('click', () => {
        fetchReleases(true);
    });
    
    // Retry Button
    DOM.btnRetry.addEventListener('click', () => {
        fetchReleases();
    });

    // Search Input (Debounced search)
    let searchTimeout;
    DOM.inputSearch.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            appData.searchQuery = e.target.value.toLowerCase().trim();
            filterAndRenderTimeline();
        }, 250);
    });

    // Filter Buttons
    DOM.filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            DOM.filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            appData.activeFilter = e.target.dataset.filter;
            filterAndRenderTimeline();
        });
    });

    // Tweet Textarea Character Counter
    DOM.tweetText.addEventListener('input', (e) => {
        updateCharacterCounter(e.target.value);
    });

    // Tweet on X Button
    DOM.btnTweet.addEventListener('click', () => {
        if (!DOM.btnTweet.disabled && DOM.tweetText.value.trim()) {
            const tweetContent = DOM.tweetText.value;
            const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetContent)}`;
            window.open(xUrl, '_blank');
        }
    });

    // Copy to Clipboard Button
    DOM.btnCopy.addEventListener('click', () => {
        const text = DOM.tweetText.value;
        if (text) {
            navigator.clipboard.writeText(text).then(() => {
                const originalText = DOM.btnCopy.innerHTML;
                DOM.btnCopy.innerHTML = '<span class="btn-text">Copied!</span>';
                DOM.btnCopy.style.borderColor = 'var(--color-feature)';
                setTimeout(() => {
                    DOM.btnCopy.innerHTML = originalText;
                    DOM.btnCopy.style.borderColor = 'var(--border-color)';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy: ', err);
            });
        }
    });
}

// Fetch Release Notes from API
function fetchReleases(isRefresh = false) {
    if (isRefresh) {
        DOM.btnRefresh.classList.add('loading');
    } else {
        DOM.loadingIndicator.classList.remove('hidden');
        DOM.releasesTimeline.classList.add('hidden');
        DOM.errorDisplay.classList.add('hidden');
    }
    
    fetch('/api/releases')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server returned status ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                appData.releases = data.releases;
                calculateStats();
                filterAndRenderTimeline();
            } else {
                throw new Error(data.error || 'Unknown error occurred while parsing the feed.');
            }
        })
        .catch(err => {
            console.error('Error fetching release notes:', err);
            DOM.errorMessage.textContent = err.message || 'Could not fetch updates from the Google Cloud feed.';
            DOM.errorDisplay.classList.remove('hidden');
            DOM.releasesTimeline.classList.add('hidden');
            DOM.loadingIndicator.classList.add('hidden');
        })
        .finally(() => {
            DOM.btnRefresh.classList.remove('loading');
            if (!DOM.errorDisplay.classList.contains('hidden')) {
                DOM.loadingIndicator.classList.add('hidden');
            }
        });
}

// Calculate Feed Statistics
function calculateStats() {
    let totalFeatures = 0;
    let totalIssues = 0;
    let totalChanges = 0;

    appData.releases.forEach(release => {
        release.updates.forEach(update => {
            const type = update.type.toLowerCase();
            if (type.includes('feature')) {
                totalFeatures++;
            } else if (type.includes('issue') || type.includes('breaking')) {
                totalIssues++;
            } else {
                totalChanges++;
            }
        });
    });

    DOM.valTotalReleases.textContent = appData.releases.length;
    DOM.valFeatures.textContent = totalFeatures;
    DOM.valIssues.textContent = totalIssues;
    DOM.valChanges.textContent = totalChanges;
}

// Check if an update matches the current filters and search query
function matchesFilterAndSearch(update, dateTitle) {
    // Type filtering
    if (appData.activeFilter !== 'all') {
        const uType = update.type.toLowerCase();
        const filter = appData.activeFilter.toLowerCase();
        
        if (filter === 'feature' && !uType.includes('feature')) return false;
        if (filter === 'issue' && !uType.includes('issue') && !uType.includes('breaking')) return false;
        if (filter === 'change' && !uType.includes('change') && !uType.includes('announcement')) return false;
    }

    // Search query filtering
    if (appData.searchQuery) {
        const textToSearch = `${update.type} ${update.body_text} ${dateTitle}`.toLowerCase();
        return textToSearch.includes(appData.searchQuery);
    }

    return true;
}

// Render Timeline based on search and filters
function filterAndRenderTimeline() {
    DOM.loadingIndicator.classList.add('hidden');
    DOM.releasesTimeline.innerHTML = '';
    
    let visibleReleaseCount = 0;
    let visibleUpdateCount = 0;

    appData.releases.forEach(release => {
        // Filter updates for this release
        const matchedUpdates = release.updates.filter(update => matchesFilterAndSearch(update, release.title));
        
        if (matchedUpdates.length > 0) {
            visibleReleaseCount++;
            visibleUpdateCount += matchedUpdates.length;

            const dateSection = document.createElement('div');
            dateSection.className = 'date-section';

            // Date Header
            const dateHeader = document.createElement('div');
            dateHeader.className = 'date-header';
            
            const marker = document.createElement('div');
            marker.className = 'date-marker';
            
            const dateTitle = document.createElement('h2');
            dateTitle.className = 'date-title';
            dateTitle.textContent = release.title;
            
            const dateLink = document.createElement('a');
            dateLink.className = 'date-link';
            dateLink.href = release.link;
            dateLink.target = '_blank';
            dateLink.title = 'View original release notes page';
            dateLink.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2005/svg">
                    <path d="M19 19H5V5H12V3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V12H19V19ZM14 3V5H17.59L7.76 14.83L9.17 16.24L19 6.41V10H21V3H14Z" fill="currentColor"/>
                </svg>
            `;

            dateHeader.appendChild(dateTitle);
            dateHeader.appendChild(dateLink);
            
            dateSection.appendChild(marker);
            dateSection.appendChild(dateHeader);

            // Updates List
            const updatesList = document.createElement('div');
            updatesList.className = 'updates-list';

            matchedUpdates.forEach(update => {
                const card = document.createElement('div');
                card.className = 'update-card';
                card.id = `card-${update.id}`;
                if (appData.selectedUpdate && appData.selectedUpdate.id === update.id) {
                    card.classList.add('selected');
                }

                // Header of card (Badge and actions)
                const cardHeader = document.createElement('div');
                cardHeader.className = 'card-header';
                
                const badgeClass = getBadgeClass(update.type);
                const badge = document.createElement('span');
                badge.className = `badge ${badgeClass}`;
                badge.textContent = update.type;
                
                const actions = document.createElement('div');
                actions.className = 'card-actions';
                
                // Share Button inside card
                const shareBtn = document.createElement('button');
                shareBtn.className = 'icon-btn share-btn';
                shareBtn.title = 'Draft a tweet for this update';
                shareBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2005/svg">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                `;
                
                actions.appendChild(shareBtn);
                cardHeader.appendChild(badge);
                cardHeader.appendChild(actions);

                // Body of card
                const cardBody = document.createElement('div');
                cardBody.className = 'card-body';
                cardBody.innerHTML = update.body_html;

                card.appendChild(cardHeader);
                card.appendChild(cardBody);

                // Click Card to Select
                card.addEventListener('click', (e) => {
                    // If they clicked on a link inside the card body, don't trigger select
                    if (e.target.tagName === 'A') return;
                    selectUpdate(update, release);
                });
                
                // Clicking icon button selects and drafts immediately
                shareBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectUpdate(update, release);
                    DOM.tweetText.focus();
                });

                updatesList.appendChild(card);
            });

            dateSection.appendChild(updatesList);
            DOM.releasesTimeline.appendChild(dateSection);
        }
    });

    // Handle empty state
    if (visibleUpdateCount === 0) {
        DOM.releasesTimeline.classList.add('hidden');
        DOM.noResultsIndicator.classList.remove('hidden');
    } else {
        DOM.releasesTimeline.classList.remove('hidden');
        DOM.noResultsIndicator.classList.add('hidden');
    }
}

// Select an update to compose tweet
function selectUpdate(update, release) {
    // Remove previous selection classes
    document.querySelectorAll('.update-card').forEach(c => c.classList.remove('selected'));
    
    // Add selected class to active card
    const selectedCard = document.getElementById(`card-${update.id}`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }

    appData.selectedUpdate = update;
    
    // Display Tweet Composer Details
    DOM.composerTip.classList.add('hidden');
    DOM.composerInputsWrapper.classList.remove('hidden');
    DOM.btnCopy.classList.remove('hidden');
    DOM.composerStatus.textContent = `${release.title} - ${update.type}`;
    DOM.composerStatus.style.color = `var(--color-accent)`;
    
    // Generate draft text
    const draftText = draftTweet(update, release);
    DOM.tweetText.value = draftText;
    
    updateCharacterCounter(draftText);
}

// Create a draft tweet within character constraints
function draftTweet(update, release) {
    const date = release.title;
    const type = update.type;
    const url = release.link;
    const hashtags = "#BigQuery #GoogleCloud";
    
    // Template elements
    const prefix = `BigQuery Release (${date}) [${type}]: `;
    const suffix = `\n\nDetails: ${url} ${hashtags}`;
    
    const maxBodyLen = 280 - prefix.length - suffix.length;
    
    let bodyText = update.body_text;
    if (bodyText.length > maxBodyLen) {
        bodyText = bodyText.substring(0, maxBodyLen - 3) + '...';
    }
    
    return `${prefix}${bodyText}${suffix}`;
}

// Update character counter and button states
function updateCharacterCounter(text) {
    const len = text.length;
    DOM.charCount.textContent = len;
    
    // Reset warning and exceeded states
    DOM.charCount.className = '';
    DOM.composerCharWarning.classList.add('hidden');
    DOM.btnTweet.disabled = false;
    
    if (len > 280) {
        DOM.charCount.classList.add('limit-exceeded');
        DOM.btnTweet.disabled = true;
    } else if (len > 260) {
        DOM.charCount.classList.add('limit-warning');
        DOM.composerCharWarning.classList.remove('hidden');
    }
}

// Helper to determine CSS class based on release type
function getBadgeClass(type) {
    const t = type.toLowerCase();
    if (t.includes('feature')) return 'feature';
    if (t.includes('issue')) return 'issue';
    if (t.includes('breaking')) return 'breaking';
    if (t.includes('change')) return 'change';
    if (t.includes('announcement')) return 'announcement';
    return 'default';
}
