/* Apply the stored palette before the first stylesheet paints. */
(function(){'use strict';var p=DashuiPreferences.load((function(){try{return localStorage;}catch(e){return {};}})());document.documentElement.dataset.mode=p.mode;document.documentElement.dataset.palette=DashuiPreferences.palette(p.mode);})();
