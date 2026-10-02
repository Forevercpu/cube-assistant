<template>
  <section class="panel shortcuts-panel">
    <p class="eyebrow">快捷操作</p>
    <h2>键盘也能转</h2>
    <div class="shortcut-list">
      <div>
        <kbd>R</kbd><span>右面顺时针</span><kbd>⇧ R</kbd
        ><span>右面逆时针</span>
      </div>
      <div>
        <kbd>U</kbd><span>上面顺时针</span><kbd>⇧ U</kbd
        ><span>上面逆时针</span>
      </div>
      <div>
        <kbd>F</kbd><span>前面顺时针</span><kbd>⇧ F</kbd
        ><span>前面逆时针</span>
      </div>
    </div>
    <div class="notation-note">
      <strong>公式怎么看？</strong>
      <p>
        字母表示转动的面；带 <code>'</code> 表示逆时针；<br>
        带 <code>2</code> 表示连续转两次 90°，共 180°。
      </p>
    </div>
  </section>
</template>

<style scoped lang="scss">
@use "@/styles/shared";
@include shared.eyebrow;
@include shared.panel;
.shortcuts-panel {
  padding: 22px;
}

.shortcut-list {
  display: grid;
  gap: 10px;
  margin-top: 18px;

  > div {
    display: grid;
    grid-template-columns: 48px 1fr 58px 1fr;
    align-items: center;
    gap: 8px;
    color: #818c9e;
    font-size: 13px;
  }
}

kbd {
  display: grid;
  place-items: center;
  height: 34px;
  border: 1px solid #303949;
  border-bottom-width: 3px;
  border-radius: 6px;
  color: #d7deea;
  background: #1c2330;
  font-family: inherit;
  font-size: 12px;
}

.notation-note {
  margin-top: 20px;
  padding: 14px;
  border-radius: 10px;
  background: #0d121a;

  strong {
    font-size: 14px;
  }

  p {
    margin: 6px 0 0;
    color: #788396;
    font-size: 13px;
    line-height: 1.6;
  }

  code {
    color: var(--primary);
  }
}
</style>
