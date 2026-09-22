/**
 * Academy shell (stable screen id `academy`): the learning path is rendered
 * from the design-system page kit. Curriculum content (Theory Modules,
 * Worked Examples, Recall drills) lands with the content registry; the slice
 * keeps the shell and the lock semantics visible.
 */
export function AcademyScreen() {
  return (
    <div className="academy">
      <section className="academy-path" aria-label="Учебный путь">
        <div className="path-module">
          <span className="kicker">MODULE 01</span>
          <h2>Decision Foundations</h2>
          <p>Факт → гипотеза → план → инвалидация. Базовый цикл принятия решений.</p>
          <div className="path-status">ОТКРЫТО</div>
        </div>
        <div className="path-module locked" aria-disabled="true">
          <span className="kicker">MODULE 05</span>
          <h2>Risk &amp; Invalidation</h2>
          <p>Сначала риск, потом желание. Открывается после Mastery Stars.</p>
          <div className="path-status">12/15 ★</div>
        </div>
        <div className="path-module locked" aria-disabled="true">
          <span className="kicker">MODULE 08</span>
          <h2>Discipline</h2>
          <p>Протокол под давлением. Открывается по прогрессу главы.</p>
          <div className="path-status">LOCKED</div>
        </div>
      </section>
      <section className="academy-note" aria-label="Ограничение прототипа">
        <b>Foundation note</b>
        <p>
          Учебный контент (Theory Module → Worked Example → Skill Card → Recall)
          подключается через content registry. В этом срезе открыт игровой цикл
          на историческом сценарии.
        </p>
      </section>
    </div>
  );
}
