let ysdkInstance = null;
let playerInstance = null;
let isSdkInitialized = false;
let successfulMergesCount = 0;
let lastAdTime = Date.now();

export function initYandex() {
    return new Promise((resolve) => {
        if (typeof YaGames !== 'undefined') {
            YaGames.init().then(ysdk => {
                window.ysdk = ysdk;
                ysdkInstance = ysdk;
                isSdkInitialized = true;
                
                ysdk.getPlayer({ scopes: false }).then(player => {
                    playerInstance = player;
                    console.log("Yandex Player profile loaded successfully.");
                    resolve(true);
                }).catch(err => {
                    console.warn("Yandex Player initialization failed/guest mode:", err);
                    resolve(true);
                });
                
                ysdk.ready();
            }).catch(err => {
                console.error("Yandex SDK initialization error:", err);
                resolve(false);
            });
        } else {
            console.warn("YaGames global object not found.");
            resolve(false);
        }
    });
}

export function isYandexActive() {
    return isSdkInitialized;
}

export async function getCloudData() {
    if (playerInstance) {
        try {
            const data = await playerInstance.getData();
            return data;
        } catch (e) {
            console.error("Error retrieving cloud data:", e);
        }
    }
    return null;
}

export async function saveCloudData(data) {
    if (playerInstance) {
        try {
            await playerInstance.setData(data, true);
            return true;
        } catch (e) {
            console.error("Error saving cloud data:", e);
        }
    }
    return false;
}

export function showInterstitialAd() {
    if (window.ysdk && window.ysdk.adv) {
        window.ysdk.adv.showFullscreenAdv({
            callbacks: {
                onClose: () => { lastAdTime = Date.now(); },
                onError: () => { lastAdTime = Date.now(); }
            }
        });
    }
}

export function checkIntervalAd() {
    if (Date.now() - lastAdTime >= 3 * 60 * 1000) {
        showInterstitialAd();
        lastAdTime = Date.now();
    }
}

export function registerSuccessfulMerge() {
    successfulMergesCount++;
    if (successfulMergesCount % 5 === 0) {
        showInterstitialAd();
    }
}

export function showRewardedVideoAd(onSuccess) {
    if (window.ysdk && window.ysdk.adv) {
        window.ysdk.adv.showRewardedVideo({
            callbacks: {
                onRewarded: () => {
                    onSuccess();
                },
                onClose: () => {
                    lastAdTime = Date.now();
                },
                onError: (e) => {
                    console.error("Rewarded Video Error:", e);
                }
            }
        });
    } else {
        // Fallback for offline testing
        console.log("Mock Rewarded Ad: Success");
        onSuccess();
    }
}

export function getPlayerName() {
    if (playerInstance) {
        try {
            return playerInstance.getName() || "Ученый";
        } catch (e) {
            console.warn("Could not retrieve Yandex player name:", e);
        }
    }
    return "Ученый";
}
