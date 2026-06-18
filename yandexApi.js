let ysdkInstance = null;
let playerInstance = null;

function initYandex() {
    return new Promise((resolve) => {
        if (typeof YaGames !== 'undefined') {
            YaGames.init().then(ysdk => {
                window.ysdk = ysdk;
                ysdkInstance = ysdk;
                
                ysdk.getPlayer({ scopes: false }).then(player => {
                    playerInstance = player;
                    console.log("Yandex Player loaded");
                    resolve(true);
                }).catch(err => {
                    console.warn("Player init failed:", err);
                    resolve(false);
                });
                
            }).catch(err => {
                console.error("Yandex SDK init error:", err);
                resolve(false);
            });
        } else {
            console.warn("YaGames not found, using local storage fallback.");
            resolve(false);
        }
    });
}

function showInterstitialAd() {
    if (window.ysdk && window.ysdk.adv) {
        window.ysdk.adv.showFullscreenAdv({
            callbacks: {
                onClose: function(wasShown) {
                    console.log("Ad closed");
                },
                onError: function(error) {
                    console.error("Ad error", error);
                }
            }
        });
    } else {
        console.log("Mock Interstitial Ad shown");
    }
}
