(function () {
  'use strict';

  var THEME_KEY = 'horizon-theme';
  var LANGUAGE_KEY = 'horizon-lang';
  var SAVED_KEY = 'horizon-saved-stories';

  function storageGet(key) {
    try { return window.localStorage.getItem(key); } catch (error) { return null; }
  }

  function storageSet(key, value) {
    try { window.localStorage.setItem(key, value); } catch (error) { /* noop */ }
  }

  function systemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function effectiveTheme() {
    var explicit = document.documentElement.getAttribute('data-theme');
    return explicit === 'dark' || explicit === 'light' ? explicit : systemTheme();
  }

  function updateThemeMeta() {
    var themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', effectiveTheme() === 'dark' ? '#000000' : '#f5f5f7');
  }

  function updateThemeControl() {
    var button = document.querySelector('[data-theme-toggle]');
    if (!button) return;
    var dark = effectiveTheme() === 'dark';
    var label = dark ? 'Use light mode' : 'Use dark mode';
    var visibleLabel = button.querySelector('[data-theme-label]');
    if (visibleLabel) visibleLabel.textContent = dark ? 'Light' : 'Dark';
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-pressed', dark ? 'true' : 'false');
    updateThemeMeta();
  }

  function setupThemeToggle() {
    updateThemeMeta();
    var button = document.querySelector('[data-theme-toggle]');
    if (!button) return;

    button.addEventListener('click', function () {
      var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      storageSet(THEME_KEY, next);
      updateThemeControl();
    });

    var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    if (media) {
      var onSystemChange = function () {
        if (!document.documentElement.hasAttribute('data-theme')) updateThemeControl();
      };
      if (media.addEventListener) media.addEventListener('change', onSystemChange);
      else if (media.addListener) media.addListener(onSystemChange);
    }

    updateThemeControl();
  }

  function setTextPreservingChildren(element, value) {
    var firstText = null;
    for (var index = 0; index < element.childNodes.length; index += 1) {
      if (element.childNodes[index].nodeType === 3) {
        firstText = element.childNodes[index];
        break;
      }
    }
    if (firstText) firstText.nodeValue = value + ' ';
    else element.textContent = value;
  }

  function updateLanguage(lang) {
    var normalized = lang === 'zh' ? 'zh' : 'en';
    document.documentElement.setAttribute('lang', normalized === 'zh' ? 'zh-CN' : 'en');
    document.querySelectorAll('[data-lang]').forEach(function (button) {
      var active = button.getAttribute('data-lang') === normalized;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    document.querySelectorAll('[data-i18n]').forEach(function (element) {
      var value = element.getAttribute('data-' + normalized);
      if (value !== null) setTextPreservingChildren(element, value);
    });

    document.querySelectorAll('[data-save-story]').forEach(function (button) {
      if (!button.classList.contains('is-saved')) {
        var saveLabel = button.getAttribute('data-save-' + normalized);
        if (saveLabel) button.textContent = saveLabel;
      }
    });
    document.querySelectorAll('[data-copy-story]').forEach(function (button) {
      if (!button.classList.contains('is-copied')) {
        var copyLabel = button.getAttribute('data-copy-' + normalized);
        if (copyLabel) button.textContent = copyLabel;
      }
    });

    var rss = document.querySelector('.rss-link');
    if (rss) {
      rss.href = normalized === 'zh' ? rss.dataset.zhHref : rss.dataset.enHref;
      rss.setAttribute('aria-label', normalized === 'zh' ? '订阅中文 RSS' : 'Subscribe to the English RSS feed');
    }
    storageSet(LANGUAGE_KEY, normalized);
  }

  function setupLanguageToggle() {
    var buttons = document.querySelectorAll('.language-button[data-lang]');
    if (!buttons.length) return;

    var rss = document.querySelector('.rss-link');
    if (rss) {
      rss.dataset.enHref = rss.getAttribute('href');
      rss.dataset.zhHref = rss.getAttribute('href').replace('feed-en.xml', 'feed-zh.xml');
    }

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        updateLanguage(button.getAttribute('data-lang'));
      });
    });
    updateLanguage(storageGet(LANGUAGE_KEY) === 'zh' ? 'zh' : 'en');
  }

  function savedStoryIds() {
    var raw = storageGet(SAVED_KEY);
    if (!raw) return [];
    try {
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function updateSavedButtons() {
    var saved = savedStoryIds();
    document.querySelectorAll('[data-save-story]').forEach(function (button) {
      var active = saved.indexOf(button.getAttribute('data-story-id')) !== -1;
      button.classList.toggle('is-saved', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
      if (active) button.textContent = document.documentElement.getAttribute('lang') === 'zh-CN' ? '已保存' : 'Saved';
      else button.textContent = document.documentElement.getAttribute('lang') === 'zh-CN' ? button.getAttribute('data-save-zh') : button.getAttribute('data-save-en');
    });
  }

  function setupStoryActions() {
    document.querySelectorAll('[data-save-story]').forEach(function (button) {
      button.addEventListener('click', function () {
        var id = button.getAttribute('data-story-id');
        var saved = savedStoryIds();
        var index = saved.indexOf(id);
        if (index === -1) saved.push(id);
        else saved.splice(index, 1);
        storageSet(SAVED_KEY, JSON.stringify(saved));
        updateSavedButtons();
      });
    });

    document.querySelectorAll('[data-copy-story]').forEach(function (button) {
      button.addEventListener('click', function () {
        var url = button.getAttribute('data-story-url');
        var done = function () {
          button.classList.add('is-copied');
          button.textContent = document.documentElement.getAttribute('lang') === 'zh-CN' ? '已复制' : 'Copied';
          window.setTimeout(function () {
            button.classList.remove('is-copied');
            button.textContent = document.documentElement.getAttribute('lang') === 'zh-CN' ? button.getAttribute('data-copy-zh') : button.getAttribute('data-copy-en');
          }, 1400);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(done).catch(function () {});
        }
      });
    });
    updateSavedButtons();
  }

  function setupSectionNavigation() {
    var jump = document.querySelector('#section-jump');
    if (jump) {
      jump.addEventListener('change', function () {
        var target = document.getElementById(jump.value);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    var tabs = document.querySelectorAll('[data-section-tab]');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (candidate) { candidate.classList.remove('is-active'); });
        tab.classList.add('is-active');
      });
    });

    var sections = Array.prototype.slice.call(document.querySelectorAll('.digest-section'));
    var priority = ['products', 'research', 'blogs', 'hn'];
    var activeId = 'products';

    function setActiveSection(id) {
      if (!id) return;
      activeId = id;
      tabs.forEach(function (tab) { tab.classList.toggle('is-active', tab.getAttribute('data-section-tab') === id); });
      if (jump) jump.value = 'section-' + id;
    }

    function updateActiveSection() {
      if (!sections.length) return;
      var marker = window.innerHeight * 0.24;
      var visible = sections.filter(function (section) {
        var rect = section.getBoundingClientRect();
        return rect.top <= marker && rect.bottom > marker;
      });
      if (!visible.length) {
        visible = sections.filter(function (section) { return section.getBoundingClientRect().top > marker; });
      }
      if (!visible.length) visible = [sections[sections.length - 1]];
      visible.sort(function (left, right) {
        return priority.indexOf(left.id.replace('section-', '')) - priority.indexOf(right.id.replace('section-', ''));
      });
      setActiveSection(visible[0].id.replace('section-', ''));
    }

    var ticking = false;
    function scheduleActiveUpdate() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        ticking = false;
        updateActiveSection();
      });
    }
    window.addEventListener('scroll', scheduleActiveUpdate, { passive: true });
    window.addEventListener('resize', scheduleActiveUpdate);
    setActiveSection(activeId);
    updateActiveSection();
  }

  function counterpartPath(path) {
    var trailingSlash = /\/$/.test(path);
    var cleanPath = path.replace(/\/$/, '');
    var target = null;
    if (/-en(\.html)?$/.test(cleanPath)) {
      target = cleanPath.replace(/-en(\.html)?$/, '-zh$1');
    } else if (/-zh(\.html)?$/.test(cleanPath)) {
      target = cleanPath.replace(/-zh(\.html)?$/, '-en$1');
    }
    return target ? target + (trailingSlash ? '/' : '') : null;
  }

  function disableUnavailableLanguageLink(link) {
    link.removeAttribute('href');
    link.setAttribute('aria-disabled', 'true');
    link.setAttribute('tabindex', '-1');
    link.classList.add('is-unavailable');
  }

  /** Restore the compact EN/中文 control on generated -en/-zh article pages. */
  function setupArticleLanguageToggle() {
    if (document.body.classList.contains('horizon-home')) return;
    var currentPath = window.location.pathname;
    var targetPath = counterpartPath(currentPath);
    if (!targetPath) return;

    var currentLang = /-zh(?:\.html)?\/?$/.test(currentPath) ? 'zh' : 'en';
    var nav = document.createElement('nav');
    nav.className = 'article-language-toggle';
    nav.setAttribute('aria-label', 'Language');

    function makeLink(lang, label, href) {
      var link = document.createElement('a');
      link.textContent = label;
      link.setAttribute('data-lang', lang);
      link.setAttribute('aria-label', lang === 'en' ? 'English' : '中文');
      if (lang === currentLang) {
        link.href = currentPath;
        link.setAttribute('aria-current', 'page');
        link.className = 'is-active';
      } else {
        link.href = href;
      }
      return link;
    }

    var enLink = makeLink('en', 'EN', currentLang === 'en' ? currentPath : targetPath);
    var zhLink = makeLink('zh', '中文', currentLang === 'zh' ? currentPath : targetPath);
    var divider = document.createElement('span');
    divider.textContent = '|';
    divider.setAttribute('aria-hidden', 'true');
    nav.appendChild(enLink);
    nav.appendChild(divider);
    nav.appendChild(zhLink);
    document.body.insertBefore(nav, document.body.firstChild);

    var counterpartLink = currentLang === 'en' ? zhLink : enLink;
    if (window.fetch) {
      window.fetch(targetPath, { method: 'HEAD', credentials: 'same-origin' })
        .then(function (response) {
          if (!response.ok) disableUnavailableLanguageLink(counterpartLink);
        })
        .catch(function () { disableUnavailableLanguageLink(counterpartLink); });
    }
  }

  /** Keep score badges useful on generated digest posts. */
  function processScoreBadges() {
    var scoreRe = /⭐️\s*(\d+(?:\.\d+)?)\/10/;
    document.querySelectorAll('.main-content h2, .main-content h3, .main-content li').forEach(function (element) {
      var match = element.innerHTML.match(scoreRe);
      if (!match) return;
      var score = parseFloat(match[1]);
      var tier = score >= 9 ? 'high' : score >= 7 ? 'good' : score >= 5 ? 'mid' : 'low';
      element.innerHTML = element.innerHTML.replace(
        scoreRe,
        '<span class="score-badge" data-tier="' + tier + '">' + match[1] + '</span>'
      );
    });
  }

  /** Add semantic classes to generated digest metadata. */
  function markSemanticElements() {
    document.querySelectorAll('.main-content p').forEach(function (paragraph) {
      var text = paragraph.textContent.trim();
      if (/^(Tags|标签)\s*:/.test(text)) {
        paragraph.classList.add('tag-line');
      } else if (/^(rss|reddit|github|hackernews|hn|telegram)\s*·/i.test(text)) {
        paragraph.classList.add('source-line');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    processScoreBadges();
    markSemanticElements();
    setupThemeToggle();
    setupLanguageToggle();
    setupStoryActions();
    setupSectionNavigation();
    setupArticleLanguageToggle();
  });
}());
