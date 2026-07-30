const variants = [
  { key: 'A', name: 'Compact dialog' },
  { key: 'B', name: 'Bottom sheet' },
  { key: 'C', name: 'Activity zero' }
];

const stage = document.querySelector('#stage');
const variantLabel = document.querySelector('#variant-label');
const stateLabel = document.querySelector('#prototype-state');
const progressFill = document.querySelector('#progress-fill');
const unitNote = document.querySelector('#unit-note');

let prefaceOpen = true;
let detailsOpen = false;
let prefaceRead = false;

function currentVariantIndex() {
  const key = new URLSearchParams(window.location.search).get('variant')?.toUpperCase();
  const index = variants.findIndex((variant) => variant.key === key);
  return index === -1 ? 0 : index;
}

function setVariant(index) {
  const variant = variants[(index + variants.length) % variants.length];
  const url = new URL(window.location.href);
  url.searchParams.set('variant', variant.key);
  window.history.replaceState({}, '', url);
  prefaceOpen = true;
  detailsOpen = false;
  prefaceRead = false;
  render();
}

function waitingActivity() {
  return `
    <article class="activity" aria-hidden="true">
      <p class="kicker">New word</p>
      <h2>One way to say &ldquo;they&rdquo;</h2>
      <div class="word-card"><strong>ils</strong><span>they</span></div>
      <button class="primary" type="button" tabindex="-1">Continue</button>
    </article>`;
}

function summaryContent() {
  return `
    <div class="preface-card">
      <p class="kicker">A note before you begin</p>
      <h2>Ways to say &ldquo;they&rdquo;</h2>
      <p class="summary">The form you hear may depend on the region or the speaker.</p>
      <div class="pronouns" aria-label="Pronouns introduced in this unit">
        <span>ils</span><span>eux-autres</span><span>eusse</span><span>&ccedil;a</span>
      </div>
      <div class="acceptance-note"><strong>&check;</strong><span>The app will accept multiple forms in your answers.</span></div>
      <div class="preface-actions">
        <button class="secondary learn-more" type="button">Learn more</button>
        <button class="primary start-lesson" type="button">Start lesson</button>
      </div>
    </div>`;
}

function compactDialog() {
  return `
    ${waitingActivity()}
    <div class="scrim"></div>
    <div class="dialog-positioner">
      <section class="compact-dialog" role="dialog" aria-modal="true" aria-label="Lesson preface">
        ${summaryContent()}
      </section>
    </div>`;
}

function bottomSheet() {
  return `
    ${waitingActivity()}
    <div class="scrim"></div>
    <div class="sheet-positioner">
      <section class="compact-sheet" role="dialog" aria-modal="true" aria-label="Lesson preface">
        <div class="sheet-handle"></div>
        ${summaryContent()}
      </section>
    </div>`;
}

function activityZero() {
  return `
    <article class="activity activity-zero">
      ${summaryContent()}
      <p class="zero-count">Unit note &middot; Activities begin after this screen</p>
    </article>`;
}

function detailsView() {
  return `
    <section class="details-view" role="dialog" aria-modal="true" aria-labelledby="details-title">
      <header class="details-header">
        <button class="close-button close-details" type="button" aria-label="Back to summary">&larr;</button>
        <div><h2 id="details-title">Why are there different forms?</h2><p>Optional unit note</p></div>
      </header>
      <div class="details-content">
        <section class="detail-section">
          <h3>Language changes by place</h3>
          <p>You&rsquo;ll hear <strong>eusse</strong> more frequently in southeast Louisiana, including Terrebonne and Lafourche, than in the rest of the state.</p>
        </section>
        <section class="detail-section">
          <h3>People may switch forms</h3>
          <p>The same person may use different words interchangeably. Marie might mostly use <strong>ils</strong>, but sometimes say <strong>&ccedil;a</strong>, particularly when speaking generally.</p>
          <blockquote class="quote">&ldquo;&Ccedil;a parle fran&ccedil;ais &agrave; Mamou.&rdquo;<span>&ldquo;They speak French in Mamou.&rdquo;</span></blockquote>
        </section>
        <section class="detail-section">
          <h3>A form shared across French</h3>
          <p><strong>Ils</strong> is common both in Louisiana and throughout the French-speaking world. Even with <strong>ils</strong>, Louisiana speakers may conjugate some verbs differently.</p>
        </section>
        <section class="detail-section">
          <h3>Answer naturally</h3>
          <p>This app will do its best to accept <strong>ils</strong>, <strong>eux-autres</strong>, <strong>eusse</strong>, and <strong>&ccedil;a</strong> when more than one form works.</p>
        </section>
      </div>
    </section>`;
}

function activeLesson() {
  return `
    <article class="activity">
      <p class="kicker">New word</p>
      <h2>One way to say &ldquo;they&rdquo;</h2>
      <div class="word-card"><strong>ils</strong><span>they</span></div>
      <button class="primary" type="button">Continue</button>
    </article>`;
}

function render() {
  const variant = variants[currentVariantIndex()];
  variantLabel.textContent = `${variant.key} - ${variant.name}`;
  unitNote.hidden = !prefaceRead || prefaceOpen;
  progressFill.style.width = prefaceRead && !prefaceOpen ? '8.33%' : '0';

  if (detailsOpen) {
    stateLabel.textContent = prefaceRead ? 'Optional details reopened' : 'Optional details | Preface unread';
    stage.innerHTML = detailsView();
    return;
  }

  if (!prefaceOpen) {
    stateLabel.textContent = 'Preface read | Activity 1 of 12';
    stage.innerHTML = activeLesson();
    return;
  }

  stateLabel.textContent = prefaceRead ? 'Preface reopened' : 'First opening | Preface unread';
  if (variant.key === 'A') stage.innerHTML = compactDialog();
  else if (variant.key === 'B') stage.innerHTML = bottomSheet();
  else stage.innerHTML = activityZero();
}

function startLesson() {
  prefaceRead = true;
  prefaceOpen = false;
  detailsOpen = false;
  render();
}

stage.addEventListener('click', (event) => {
  if (event.target.closest('.learn-more')) {
    detailsOpen = true;
  } else if (event.target.closest('.close-details')) {
    detailsOpen = false;
  } else if (event.target.closest('.start-lesson')) {
    startLesson();
    return;
  } else {
    return;
  }
  render();
});

unitNote.addEventListener('click', () => {
  detailsOpen = true;
  render();
});

document.querySelector('#previous-variant').addEventListener('click', () => {
  setVariant(currentVariantIndex() - 1);
});

document.querySelector('#next-variant').addEventListener('click', () => {
  setVariant(currentVariantIndex() + 1);
});

document.querySelector('#reset-prototype').addEventListener('click', () => {
  prefaceOpen = true;
  detailsOpen = false;
  prefaceRead = false;
  render();
});

window.addEventListener('keydown', (event) => {
  const activeElement = document.activeElement;
  if (
    activeElement?.tagName === 'INPUT' ||
    activeElement?.tagName === 'TEXTAREA' ||
    activeElement?.isContentEditable
  ) return;
  if (event.key === 'ArrowLeft') setVariant(currentVariantIndex() - 1);
  if (event.key === 'ArrowRight') setVariant(currentVariantIndex() + 1);
});

window.addEventListener('popstate', render);

if (!new URLSearchParams(window.location.search).has('variant')) {
  const url = new URL(window.location.href);
  url.searchParams.set('variant', 'A');
  window.history.replaceState({}, '', url);
}

render();
