// 05 — «Что нужно вашему питомцу?»: пошаговая подготовка текста обращения.
// Не запись и не диагностика — итог предлагает позвонить и скопировать информацию.
import gsap from 'gsap';
const PET: Record<string, { name: string; acc: string }> = {
  cat: { name: 'Кошка', acc: 'кошку' },
  dog: { name: 'Собака', acc: 'собаку' },
  rodent: { name: 'Грызун или кролик', acc: 'грызуна или кролика' },
  bird: { name: 'Птица', acc: 'птицу' },
  reptile: { name: 'Рептилия', acc: 'рептилию' },
};
const STEPS = ['pet', 'reason', 'when'];

export function initHelper() {
  const form = document.querySelector<HTMLFormElement>('.console');
  if (!form) return;
  const steps = [...form.querySelectorAll<HTMLFieldSetElement>('.cstep')];
  const rail = [...form.querySelectorAll<HTMLElement>('.console__rail li')];
  const ind = form.querySelector<HTMLElement>('.console__step-ind b')!;
  const back = form.querySelector<HTMLButtonElement>('[data-back]')!;
  const reset = form.querySelector<HTMLButtonElement>('[data-reset]')!;
  const nextBtn = form.querySelector<HTMLButtonElement>('[data-next]')!;
  const syncNext = () => { const names = STEPS; nextBtn.disabled = cur >= 3 || !val(names[cur]); nextBtn.hidden = cur >= 3; };
  const resText = form.querySelector<HTMLElement>('.result__text')!;
  const resReason = form.querySelector<HTMLElement>('.result__reason')!;
  const copyBtn = form.querySelector<HTMLButtonElement>('.copy-btn')!;
  const sum = (k: string) => form.querySelector<HTMLElement>(`[data-sum="${k}"]`)!;
  let cur = 0;
  let pointer = false;

  const val = (name: string) => (form.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value ?? '');

  const go = (n: number) => {
    if (n === cur) return;
    const from = steps[cur], to = steps[n];
    const dir = n > cur ? 1 : -1;
    cur = n;
    rail.forEach((r, i) => { r.classList.toggle('is-current', i === n); r.classList.toggle('is-done', i < n); });
    ind.textContent = String(n + 1);
    back.disabled = n === 0;
    syncNext();
    gsap.to(from, {
      x: -60 * dir, opacity: 0, filter: 'blur(8px)', duration: .35, ease: 'power2.in',
      onComplete: () => {
        from.classList.remove('is-active'); from.disabled = true;
        gsap.set(from, { clearProps: 'all' });
        to.disabled = false; to.classList.add('is-active');
        gsap.fromTo(to, { x: 60 * dir, opacity: 0, filter: 'blur(8px)' }, { x: 0, opacity: 1, filter: 'blur(0px)', duration: .7, ease: 'expo.out', clearProps: 'filter' });
        const kids = to.querySelectorAll('.pet-opt, .opt, .dchip, .result > *');
        gsap.fromTo(kids, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .8, stagger: .05, ease: 'expo.out' });
        const focusEl = to.querySelector<HTMLElement>('input:checked, input, .result__text');
        if (n === 3) { resText.setAttribute('tabindex', '-1'); resText.focus({ preventScroll: true }); }
        else focusEl?.focus({ preventScroll: true });
      },
    });
  };

  const buildResult = () => {
    const pet = PET[val('pet')];
    const reason = val('reason');
    resText.innerHTML = `Вы хотите записать <b>${pet?.acc ?? 'питомца'}</b> в клинику — <b>${val('when') || 'в удобное время'}</b>.`;
    resReason.textContent = `Причина обращения: ${reason || '—'}`;
    form.querySelector('.result')!.classList.toggle('is-urgent', reason === 'Срочная ситуация');
    copyBtn.dataset.state = 'idle';
  };

  form.addEventListener('pointerdown', () => { pointer = true; });
  form.addEventListener('keydown', e => {
    pointer = false;
    // Enter на выбранном пункте — следующий шаг
    if (e.key === 'Enter' && (e.target as HTMLElement).matches('input[type="radio"]')) { e.preventDefault(); next(); }
  });

  const next = () => {
    const names = STEPS;
    if (cur < 3 && val(names[cur])) { if (cur === 2) buildResult(); go(cur + 1); }
  };

  form.addEventListener('change', e => {
    const t = e.target as HTMLInputElement;
    if (t.name === 'pet') sum('pet').textContent = PET[t.value].name;
    if (t.name === 'reason') sum('reason').textContent = t.value;
    if (t.name === 'when') sum('when').textContent = t.value[0].toUpperCase() + t.value.slice(1);
    // Мышью/пальцем — авто-переход; с клавиатуры — по Enter, чтобы стрелки не перелистывали шаги
    syncNext();
    if (pointer) setTimeout(next, 380);
  });
  nextBtn.addEventListener('click', next);

  back.addEventListener('click', () => cur > 0 && go(cur - 1));
  reset.addEventListener('click', () => {
    form.reset();
    STEPS.forEach(k => (sum(k).textContent = '—'));
    if (cur !== 0) go(0);
  });

  copyBtn.addEventListener('click', async () => {
    const pet = PET[val('pet')];
    const text = [
      'Здравствуйте! Хочу записаться на приём в клинику «Ветеринар на связи».',
      `Питомец: ${pet?.name.toLowerCase() ?? '—'}`,
      `Причина обращения: ${val('reason') || '—'}`,
      `Когда удобно: ${val('when') || '—'}`,
      'Возраст и вес питомца: ',
      'Что беспокоит: ',
    ].join('\n');
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        const ok = document.execCommand('copy'); ta.remove();
        if (!ok) throw new Error('copy');
      }
      copyBtn.dataset.state = 'ok';
      gsap.fromTo(copyBtn, { scale: .96 }, { scale: 1, duration: .6, ease: 'elastic.out(1, .5)' });
      setTimeout(() => (copyBtn.dataset.state = 'idle'), 2600);
    } catch {
      copyBtn.dataset.state = 'err';
    }
  });
}
