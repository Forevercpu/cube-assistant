<script setup lang="ts">
import UserMenu from './UserMenu.vue'
import { RouterLink } from 'vue-router'
</script>

<template>
  <header class="app-header">
    <RouterLink class="brand" :to="{ name: 'home' }" aria-label="魔方助手首页">
      <span class="brand-mark">
        <i /><i /><i /> <i /><i /><i /> <i /><i /><i />
      </span>
      <span>
        <strong>魔方助手</strong>
        <small>CUBE ASSISTANT</small>
      </span>
    </RouterLink>

    <nav class="mode-tabs" aria-label="功能模式">
      <RouterLink :to="{ name: 'practice' }" active-class="active">自由练习</RouterLink>
      <RouterLink :to="{ name: 'restore' }" active-class="active">复原助手</RouterLink>
    </nav>

    <UserMenu />
  </header>
</template>

<style scoped lang="scss">
.app-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  height: 72px;
  padding: 0 max(32px, calc((100vw - 1440px) / 2));
  border-bottom: 1px solid var(--line);
  background: rgba(9, 12, 18, 0.86);
  backdrop-filter: blur(20px);
}

/* 品牌名称及九宫格标志。 */
.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: inherit;
  text-decoration: none;
  justify-self: start;

  > span:last-child {
    display: grid;
    gap: 1px;
  }

  strong {
    font-size: 19px;
    letter-spacing: 0.08em;
  }

  small {
    font-size: 12px;
    color: #758095;
    letter-spacing: 0.2em;
  }
}

/* 用 3×3 CSS 网格绘制魔方图标，不依赖图片资源。 */
.brand-mark {
  display: grid;
  grid-template-columns: repeat(3, 6px);
  gap: 2px;
  padding: 7px;
  border: 1px solid rgba(120, 228, 187, 0.35);
  border-radius: 8px;
  background: rgba(120, 228, 187, 0.08);
  transform: rotate(-5deg);

  i {
    width: 6px;
    height: 6px;
    border-radius: 1px;
    background: var(--primary);

    &:nth-child(2n) {
      opacity: 0.55;
    }

    &:nth-child(5) {
      background: #fff;
    }
  }
}

/* 模式切换按钮的默认、悬停和选中状态。 */
.mode-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.025);

  a {
    position: relative;
    display: inline-flex;
    align-items: center;
    text-decoration: none;
    height: 44px;
    padding: 0 24px;
    border: 0;
    border-radius: 7px;
    color: #8994a5;
    background: transparent;
    cursor: pointer;
    transition: 0.2s ease;

    &:hover {
      color: #dce4f1;
    }

    &.active {
      color: #fff;
      background: #202735;
      box-shadow: 0 5px 14px rgba(0, 0, 0, 0.2);
    }
  }
}
</style>
