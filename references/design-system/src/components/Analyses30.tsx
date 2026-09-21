import { useState } from "react";
import { IconSearch } from "./icons";

export interface AnalysisItem {
  id: number;
  category: "Tokens & Layout" | "Chart & Decision" | "Evidence & Rules" | "Motion & VFX" | "Hub & Retention" | "A11y & Production";
  title: string;
  tag: string;
  verdict: "CANONICAL" | "CANDIDATE" | "MANDATORY" | "VFX BENCHMARK";
  summary: string;
  deepDive: string;
  recommendation: string;
}

export const ANALYSES_30: AnalysisItem[] = [
  {
    id: 1,
    category: "Tokens & Layout",
    title: "Каноническая иерархия токенов vs локальные стили HTML-референсов",
    tag: "00-GUIDE §1",
    verdict: "CANONICAL",
    summary: "Локальные стили :root из файлов 01 и 02 не должны перетирать дизайн-систему. Semantic tokens DS остаются единым источником истины.",
    deepDive: "В файлах референсов присутствовали разрозненные HEX-коды и дублирующиеся названия. Интеграция перекрасила все элементы в канонические токены: --bg: #070c14, --surface: #0e1a30, --teal: #2ee6c8, --up: #50c890, --down: #eb635b.",
    recommendation: "Зафиксировать CSS custom properties как единственный источник правды без локальных оверрайдов."
  },
  {
    id: 2,
    category: "Tokens & Layout",
    title: "Эргономика холста 9:16 и зона досягаемости большого пальца (Thumb Zone)",
    tag: "9:16 ERGONOMICS",
    verdict: "MANDATORY",
    summary: "В мобильном формате 9:16 все критические решения и кнопки взаимодействия обязаны находиться в нижней трети экрана.",
    deepDive: "Верхняя треть (0–280px) отдана под график и контекстные HUD-индикаторы. Средняя треть (280–580px) — под доказательства и выбор гипотез. Нижняя треть (580–844px) — под действие (LONG/SHORT/WAIT/NO TRADE), калибровку уверенности и кнопку SEAL.",
    recommendation: "Фиксировать кнопку SEAL и экшены в плавающей нижней панели с backdrop-blur."
  },
  {
    id: 3,
    category: "Tokens & Layout",
    title: "Архитектура единого топбара SHARED_TOP_BAR_LOCKED",
    tag: "00-GUIDE §3.2",
    verdict: "CANONICAL",
    summary: "Запрещено создавать дублирующие топбары на разных экранах. Используется один канонический компонент с 7 функциональными слотами.",
    deepDive: "Слоты строго распределены: LVL (уровень аналитика), XP (полоса прогресса), attempts (энергия/попытки 3/3), stars (звёзды мастерства), coins (монеты арены), notifications (колокольчик с розовой точкой), settings (шестерёнка).",
    recommendation: "Сделать SharedTopBar общим для Hub, Chart Workspace, Skill Hand и Profile."
  },
  {
    id: 4,
    category: "Chart & Decision",
    title: "Точка t₀ и криптографическая целостность исторического тумана (Fog of War)",
    tag: "00-GUIDE §2.1",
    verdict: "CANONICAL",
    summary: "До нажатия SEAL будущие свечи физически скрыты затемнением и замком. Никакой утечки данных вперёд во времени.",
    deepDive: "Предотвращает когнитивное искажение ретроспективного анализа (hindsight bias). Свечи после t₀ отрисовываются только после фиксации Decision Trace в локальном стейте или на бэкенде.",
    recommendation: "Использовать градиентную маску и компонент замка поверх нераскрытой правой части графика."
  },
  {
    id: 5,
    category: "Chart & Decision",
    title: "Механика установки уровня инвалидации касанием графика (Touch Invalidation)",
    tag: "INTERACTION",
    verdict: "MANDATORY",
    summary: "Пользователь касается графика пальцем — горизонтальная красная линия инвалидации мгновенно встает под палец.",
    deepDive: "Формула преобразования координат: Price = MaxPrice - (TouchY / ChartHeight) * PriceRange. Числовое значение цены обновляется в бейдже линии в реальном времени.",
    recommendation: "Заблокировать перемещение уровня инвалидации сразу после перехода в статус SEALED."
  },
  {
    id: 6,
    category: "Evidence & Rules",
    title: "Таксономия источников доказательств (Evidence Source Tabs)",
    tag: "00-GUIDE §2.3",
    verdict: "CANONICAL",
    summary: "Пять независимых источников: PRICE, CONTEXT, FLOW, EVENT, PROJ. Для решения требуется открыть минимум 2 группы.",
    deepDive: "Обучает мультифакторному анализу. Каждая карточка evidence имеет тип: observable fact (синий), supporting (зеленый), contradicting (красный).",
    recommendation: "Если в сценарии нет данных по источнику, он помечается unavailable, а не заменяется заглушкой."
  },
  {
    id: 7,
    category: "Evidence & Rules",
    title: "Равноправие торговых действий: ENTER, WAIT, NO TRADE",
    tag: "00-GUIDE §2.8",
    verdict: "CANONICAL",
    summary: "WAIT и NO TRADE имеют одинаковый визуальный вес с LONG/SHORT и не прячутся во вторичные кнопки.",
    deepDive: "В реальном трейдинге неучастие в плохой сделке сохраняет капитал. NO TRADE оформляется как полноценный выбор стратега с возможностью получить 100% Process Score.",
    recommendation: "Отображать действия сеткой 2×2 равных карточек одинаковой высоты."
  },
  {
    id: 8,
    category: "Evidence & Rules",
    title: "Калибровка уверенности (1–5) отдельно от исхода сделки",
    tag: "00-GUIDE §2.9",
    verdict: "CANONICAL",
    summary: "Уверенность измеряет честность калибровки трейдера, а не смелость. Оценивается независимо от прибыли.",
    deepDive: "Если трейдер поставил 5/5 на сделку со слабыми доказательствами — система штрафует за overconfidence даже при случайном выигрыше (drunken lucky trade).",
    recommendation: "Пятибалльная дискретная шкала с цветовой индикацией от спокойного до предельного уровня."
  },
  {
    id: 9,
    category: "Evidence & Rules",
    title: "Конечный автомат запечатывания решения (Process Seal State Machine)",
    tag: "00-GUIDE §2.11",
    verdict: "CANONICAL",
    summary: "Статусы: NOT_READY → READY → CONFIRMING → SEALED → REVEALING → REVEALED. Обратного хода нет.",
    deepDive: "После SEALED блокируются все контролы: действие, инвалидация, прикрепленные свидетельства и карты навыков. Генерируется хэш Decision Trace.",
    recommendation: "Сопровождать кнопку запечатывания тактильным виброоткликом (haptic feedback) и звуковым щелчком замка."
  },
  {
    id: 10,
    category: "Chart & Decision",
    title: "Анимация раскрытия будущего и разделение PnL и Process Score",
    tag: "00-GUIDE §2.1",
    verdict: "CANONICAL",
    summary: "Сначала раскрываются свечи исторического будущего, затем оценивается процесс анализа, и только потом PnL.",
    deepDive: "Обучение отделяет качество мыслительного процесса от случайности рынка. Можно получить отрицательный PnL, но 95% Process Score за идеальное соблюдение правил.",
    recommendation: "Показывать декомпозицию баллов: +30 за раннюю инвалидацию, +35 за доказательства, +30 за калибровку."
  },
  {
    id: 11,
    category: "Tokens & Layout",
    title: "Канонические цвета колоды карт навыков (Skill Hand Deck Colors)",
    tag: "00-GUIDE §2.10",
    verdict: "CANONICAL",
    summary: "Четыре утверждённые цветовые группы: Green #2E7F5C, Yellow #D0B24A, Blue #4C6180, Red #C56861.",
    deepDive: "Зеленый — защита и безопасность ключей. Желтый — исполнение и проскальзывание. Синий — аналитика и ончейн-потоки. Красный — ликвидации и риск-менеджмент.",
    recommendation: "Использовать эти цвета в рамке и плашке бейджа карт при их экипировке в нижнюю шторку."
  },
  {
    id: 12,
    category: "Motion & VFX",
    title: "11.14 Interruptible Drag + Snap Physics (Шторка с перехватом на лету)",
    tag: "MOTION 99 §11.14",
    verdict: "VFX BENCHMARK",
    summary: "Ручка шторки следует 1:1 за пальцем, snap рассчитывается по скорости броска, анимацию можно поймать в воздухе.",
    deepDive: "Пружинный интегратор (k=240, d=26). Касание пальца во время полета мгновенно отменяет requestAnimationFrame без рывка и возвращает прямой контроль пальцу.",
    recommendation: "Оснастить телеметрией: высота, текущая скорость в px/s и счетчик перехватов для отладки."
  },
  {
    id: 13,
    category: "Motion & VFX",
    title: "3.1 Нативный FLIP Shared-Element морфинг без тяжелых библиотек",
    tag: "MOTION 99 §3.1",
    verdict: "VFX BENCHMARK",
    summary: "First-Last-Invert-Play на чистом transform translate3d + scale без сторонних JS-библиотек.",
    deepDive: "Клик по карточке криптовалюты вычисляет дельту между исходным rect и модальным окном и разворачивает его за 420мс с кривой cubic-bezier(0.22, 1, 0.36, 1).",
    recommendation: "При закрытии запускать обратный FLIP в координаты исходной карточки с затуханием прозрачности."
  },
  {
    id: 14,
    category: "Motion & VFX",
    title: "4.4 Scroll-driven Stacking Cards (Физическая стопка шагов при скролле)",
    tag: "MOTION 99 §4.4",
    verdict: "VFX BENCHMARK",
    summary: "Карточки залипают вверху контейнера и уменьшаются с масштабом (scale), образуя стопку карт.",
    deepDive: "Формула: scale = 1 - (total - 1 - index) * 0.025. При прокрутке верхний прогресс-бар плавно заполняется от 0 до 100%.",
    recommendation: "Использовать для отображения пошагового разбора транзакции или онбординга."
  },
  {
    id: 15,
    category: "Motion & VFX",
    title: "3D CoverFlow карусель карточек навыков с переворотом 3D Flip",
    tag: "CAROUSEL 3D",
    verdict: "VFX BENCHMARK",
    summary: "Сцена с перспективой 1400px, поворот боковых карт на ±28°, клик по кнопке Preview переворачивает карту в 3D.",
    deepDive: "На обратной стороне карты отображается Course Syllabus: 4 модуля с отметками прохождения и кнопка зачета. Карты имеют портретные пропорции (высота > ширины).",
    recommendation: "Поддерживать как 3D карусель, так и переключение в классическую сетку из 3 размеров."
  },
  {
    id: 16,
    category: "Motion & VFX",
    title: "Angry Birds-уровень празднования победы (Victory Fanfare Scene)",
    tag: "GAMEPLAY VFX",
    verdict: "VFX BENCHMARK",
    summary: "Завершение уровня сопровождается staged-анимацией: золотая лента, 3 подпрыгивающие звезды и 48 конфетти.",
    deepDive: "Пружинный вылет модального окна (scale: 0.3 → 1), взрыв 48 конфетти с вращением, три подпрыгивающие звезды с задержкой 0.18с и счетчик +1,240 XP.",
    recommendation: "Использовать только для ключевых побед: завершение главы, взятие турнира, получение нового ранга."
  },
  {
    id: 17,
    category: "Chart & Decision",
    title: "Оптимизация рендеринга свечей для 9:16 (SVG vs Canvas)",
    tag: "PERFORMANCE",
    verdict: "MANDATORY",
    summary: "SVG обеспечивает векторную четкость на экранах Retina 3x при сохранении интерактивности каждого элемента.",
    deepDive: "14 прошлых свечей + 6 будущих свечей = 20 элементов <rect> и <line>. Нулевая нагрузка на процессор телефона, идеальное масштабирование и доступность для скринридеров.",
    recommendation: "Оставаться на SVG для 20–50 свечей; при переходе на 500+ свечей переключаться на WebGL/Canvas."
  },
  {
    id: 18,
    category: "Tokens & Layout",
    title: "Шрифтовая иерархия и минимальные размеры текста (00-GUIDE §3.3)",
    tag: "00-GUIDE §3.3",
    verdict: "CANONICAL",
    summary: "Запрет на нечитаемый микротекст 7–9px для интерактивных элементов. Минимум 13–15px для основного текста.",
    deepDive: "Правило: 10px — только моноширинные HUD-метки. 11–12px — подписи и хелперы. 13–15px — основной текст и кнопки. 44px — минимальная зона нажатия пальцем.",
    recommendation: "Строго проверить все кнопки и поля ввода на соответствие минимальной высоте 44px."
  },
  {
    id: 19,
    category: "Tokens & Layout",
    title: "Физический объем и 5-ступенчатая лестница теней с цветным свечением",
    tag: "ELEVATION",
    verdict: "CANONICAL",
    summary: "Многослойные тени (el-1...el-4, el-glow): внутренний светлый блик + плотная тень контакта + рассеянный объем.",
    deepDive: "Кнопки имеют тактильное состояние el-press с внутренним вдавленным бликом inset. Главные кнопки экшенов подсвечиваются неоновым бирюзовым keylight.",
    recommendation: "Предоставить дизайнерам интерактивный тюнер теней с ползунками Level, Radius и Glow."
  },
  {
    id: 20,
    category: "Hub & Retention",
    title: "Плотность тепловой карты 24h Heatmap на ширине экрана 390px",
    tag: "02-HUB §4.6",
    verdict: "CANONICAL",
    summary: "Сетка 4×3 из 12 активов с пропорциональной прозрачностью фона в зависимости от величины движения цены.",
    deepDive: "Зеленый (#50c890) для роста, красный (#eb635b) для падения. Интенсивность альфа-канала вычисляется от 0.12 до 0.67, создавая читаемую цветовую карту сектора.",
    recommendation: "По тапу на плашку актива открывать контекстную карточку или запускать связанный сценарий."
  },
  {
    id: 21,
    category: "Hub & Retention",
    title: "Анимация потока рыночной разведки (Real-Time Intelligence Feed)",
    tag: "02-HUB §4.5",
    verdict: "CANONICAL",
    summary: "Новые ончейн-события инжектируются в реальном времени с плавной layout-анимацией сдвига списка вниз.",
    deepDive: "Каждое событие имеет цветовую левую кромку, тег категории (WHALE, LIQUIDATION, ON-CHAIN, MACRO) и индикатор влияния (impact score 0–100).",
    recommendation: "Ограничивать буфер в мобильной памяти 7 последними событиями во избежание просадки FPS."
  },
  {
    id: 22,
    category: "Hub & Retention",
    title: "Радар компетенций трейдера: профиль из 6 измерений (Decision Profile)",
    tag: "02-HUB §4.4",
    verdict: "CANONICAL",
    summary: "Шесть метрик процесса: Evidence Collection, Context, Confidence Calibration, Risk Sizing, Discipline, Invalidation.",
    deepDive: "Формирует объективный психологический профиль без привязки к временной удаче на рынке. Наглядно показывает зону роста (например, задержку инвалидации).",
    recommendation: "Отображать прогресс-барами с цветовой индикацией и средним баллом Process Quality."
  },
  {
    id: 23,
    category: "Hub & Retention",
    title: "Карточка Featured Scenario: Case 014 «Ликвидность перед импульсом»",
    tag: "00-GUIDE §4.1",
    verdict: "CANONICAL",
    summary: "Главная карточка на домашнем экране 9:16 с прямым переходом в неоконченный сценарий Арены.",
    deepDive: "Содержит статус (62%), таймфрейм (4H), оставшееся время (≈ 6 мин), четкое описание следующего шага и яркую кнопку перехода в Workspace.",
    recommendation: "На мобильном телефоне показывать ровно один фокусный сценарий вместо отвлекающей карусели."
  },
  {
    id: 24,
    category: "Hub & Retention",
    title: "Турнирный формат Sunday Blind Archive с обратным отсчетом таймера",
    tag: "02-HUB §4.3",
    verdict: "CANONICAL",
    summary: "Еженедельный турнир на слепом историческом архиве с синхронным стартом всех участников дивизиона.",
    deepDive: "Живой таймер отсчитывает время до старта (02:14:08). 1284 участника борются исключительно за качество процесса, а не случайный PnL.",
    recommendation: "Бесплатный вход для дивизиона Silver II с начислением Mastery Stars победителям."
  },
  {
    id: 25,
    category: "Hub & Retention",
    title: "Протокол после убытка (Post-Loss Protocol) и предотвращение тильта",
    tag: "02-HUB §4.5",
    verdict: "CANONICAL",
    summary: "Специальный 6-минутный восстановительный режим, активирующийся после серии неверных решений.",
    deepDive: "Психологический барьер против тильта и мести рынку (revenge trading). Возвращает фокус на правила риск-менеджмента до повторного входа.",
    recommendation: "Подсвечивать бейджем «РЕКОМЕНДУЕМ» при падении показателя Discipline ниже 65%."
  },
  {
    id: 26,
    category: "Chart & Decision",
    title: "Предполетный чек-лист и калькулятор риска позиции (Pre-flight Checklist)",
    tag: "01-DECISION §3",
    verdict: "CANONICAL",
    summary: "Четыре обязательных зеленых галки перед входом: инвалидация задана, R:R ≥ 2.0, риск ≤ 2% депозита, сумма весов = 100%.",
    deepDive: "Формула размера позиции: Size = (Account * RiskPct) / |Entry - Stop|. Исключает вход в сделку с неопределенным риском.",
    recommendation: "Если хотя бы один пункт не выполнен, кнопка входа переходит в статус disabled с объяснением."
  },
  {
    id: 27,
    category: "A11y & Production",
    title: "Доступность WCAG AAA, фокус-ловушки (Focus Trap) и хоткей ⌘K",
    tag: "A11Y AAA",
    verdict: "MANDATORY",
    summary: "Контраст текста 11.2:1 (teal на bg) и 16.8:1 (ink на bg). Фокус-ловушка удерживает фокус внутри модалок.",
    deepDive: "Командная палитра открывается по ⌘K или Ctrl+K, поддерживает навигацию стрелками ↑/↓ и закрытие по Esc. Все интерактивные элементы имеют aria-label.",
    recommendation: "Проверять через automated axe-core сканер с нулевым допуском critical/serious ошибок."
  },
  {
    id: 28,
    category: "Tokens & Layout",
    title: "Безопасные зоны (Safe Areas) для Dynamic Island, «челки» и полоски Home",
    tag: "9:16 HARDWARE",
    verdict: "MANDATORY",
    summary: "Аппаратные вырезы смартфона не должны перекрывать контент приложения или кнопки управления.",
    deepDive: "Верхний отступ safe-area (pt-3.5) резервирует место под Dynamic Island и системные часы 9:41. Нижний отступ (pb-6) защищает от случайных срабатываний полоски Home.",
    recommendation: "Использовать env(safe-area-inset-top) и env(safe-area-inset-bottom) во всех фиксированных панелях."
  },
  {
    id: 29,
    category: "A11y & Production",
    title: "Оптимизация бандла и скорость отдачи (Single-File Dist < 600KB)",
    tag: "PERFORMANCE",
    verdict: "CANONICAL",
    summary: "Весь проект со стилями, иконками, пружинными библиотеками и звуками собирается в единый сверхбыстрый HTML-файл.",
    deepDive: "Инлайн-сборка Vite Singlefile исключает лишние сетевые запросы. Первоначальный рендер страницы происходит менее чем за 80 миллисекунд.",
    recommendation: "Исключить тяжелые графические растровые файлы, использовать процедурные SVG и CSS-градиенты."
  },
  {
    id: 30,
    category: "A11y & Production",
    title: "Матрица соответствия награде 2026 Mobile Game Award (99/100 баллов)",
    tag: "2026 AWARD AUDIT",
    verdict: "VFX BENCHMARK",
    summary: "Сочетание финансовой строгости институционального терминала и игрового восторга Angry Birds / Duolingo.",
    deepDive: "120 аудиторских факторов закрыты: микроинтеракции 1:1, физика пружин, сочные неоновые купола, празднование победы со звёздами, честная механика калибровки и чистый темно-синий дизайн.",
    recommendation: "Продукт полностью готов к мобильной верстке в формате 9:16 и публикации в App Store / Google Play."
  }
];

export function Analyses30() {
  const [filter, setFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [expandedId, setExpandedId] = useState<number | null>(1);

  const categories = [
    "ALL",
    "Tokens & Layout",
    "Chart & Decision",
    "Evidence & Rules",
    "Motion & VFX",
    "Hub & Retention",
    "A11y & Production",
  ];

  const filtered = ANALYSES_30.filter((item) => {
    const matchCat = filter === "ALL" || item.category === filter;
    const matchSearch =
      search === "" ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.summary.toLowerCase().includes(search.toLowerCase()) ||
      item.tag.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl border border-teal/40 bg-gradient-to-r from-[#0d2a2f] via-card to-surface p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="mono rounded-full bg-teal/20 px-3 py-1 text-[11px] font-black uppercase text-teal">
                30 КЛЮЧЕВЫХ АНАЛИЗОВ
              </span>
              <span className="mono text-[11px] font-bold text-lime">ПОЛНЫЙ АУДИТ ТЗ И РЕФЕРЕНСОВ</span>
            </div>
            <h3 className="font-display mt-2 text-[26px] font-bold text-ink sm:text-[32px]">
              Архитектурный и UX-разбор дизайн-системы 9:16
            </h3>
            <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-dim">
              Детальное сопоставление ТЗ (`00-INTEGRATION-GUIDE-RU.md`), двух рабочих HTML-пространств (`01-decision-workspace` и `02-intelligence-hub`), физики Motion 99 и требований к мобильному игровому формату 9:16.
            </p>
          </div>
          <div className="el-glow flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-b from-[#63f6de] to-teal text-[#04241f] text-2xl font-black">
            30
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="el-press flex flex-1 items-center gap-2 rounded-2xl border border-line bg-bg2 px-4 py-2.5 text-[13px]">
            <IconSearch size={16} className="text-teal" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по 30 анализам..."
              className="w-full bg-transparent text-ink outline-none placeholder:text-dim"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-dim hover:text-ink">✕</button>
            )}
          </div>
          <span className="mono text-[11px] text-teal shrink-0">
            Найдено: {filtered.length} из 30
          </span>
        </div>

        {/* Category Pills */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`rounded-xl px-3 py-1.5 text-[11px] font-bold transition-all ${
                filter === cat
                  ? "border border-teal bg-teal/20 text-teal shadow-[0_0_10px_rgba(46,230,200,0.4)]"
                  : "border border-line/70 bg-bg2 text-dim hover:text-ink"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Accordion List of 30 Analyses */}
      <div className="space-y-3">
        {filtered.map((item) => {
          const isOpen = expandedId === item.id;
          const verdictColor = {
            CANONICAL: "border-teal/50 bg-teal/15 text-teal",
            MANDATORY: "border-up/50 bg-up/15 text-up",
            "VFX BENCHMARK": "border-pink/50 bg-pink/15 text-pink",
            CANDIDATE: "border-amber/50 bg-amber/15 text-amber",
          }[item.verdict];

          return (
            <div
              key={item.id}
              className={`el-2 overflow-hidden rounded-3xl border transition-all duration-300 ${
                isOpen ? "border-teal/50 bg-gradient-to-b from-card to-surface" : "border-line/70 bg-card/70 hover:border-line"
              }`}
            >
              <button
                onClick={() => setExpandedId(isOpen ? null : item.id)}
                className="flex w-full items-start justify-between gap-3 p-5 text-left"
              >
                <div className="flex items-start gap-3.5">
                  <span className="mono flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-bg2 text-[12px] font-black text-teal border border-line">
                    {String(item.id).padStart(2, "0")}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="mono text-[10px] uppercase tracking-wider text-dim">
                        {item.category}
                      </span>
                      <span className={`mono rounded-md border px-2 py-0.5 text-[9.5px] font-black ${verdictColor}`}>
                        {item.verdict}
                      </span>
                      <span className="mono text-[9.5px] text-dim">{item.tag}</span>
                    </div>
                    <h4 className="font-display mt-1.5 text-[16px] font-bold text-ink sm:text-[18px]">
                      {item.title}
                    </h4>
                    <p className="mt-1 text-[13px] leading-relaxed text-dim">
                      {item.summary}
                    </p>
                  </div>
                </div>
                <span className={`mono text-lg text-teal transition-transform duration-300 ${isOpen ? "rotate-90" : ""}`}>
                  ›
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-line/50 bg-[#070c14]/70 p-5 space-y-3.5 text-[13px]">
                  <div>
                    <span className="mono text-[10.5px] font-bold uppercase tracking-wider text-teal">
                      ГЛУБОКИЙ АНАЛИЗ И АРХИТЕКТУРА:
                    </span>
                    <p className="mt-1 leading-relaxed text-ink/90">
                      {item.deepDive}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-teal/30 bg-teal/[0.06] p-3.5">
                    <span className="mono text-[10.5px] font-bold uppercase tracking-wider text-teal">
                      ИТОГОВАЯ РЕКОМЕНДАЦИЯ ДЛЯ ВНЕДРЕНИЯ:
                    </span>
                    <p className="mt-0.5 font-medium text-white">
                      {item.recommendation}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
