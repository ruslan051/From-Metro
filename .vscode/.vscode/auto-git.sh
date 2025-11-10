#!/bin/bash
echo "🚀 Starting auto-git sync..."

while true; do
  # Ждем любые изменения файлов (кроме .git)
  if find . -path ./.git -prune -o -type f -newer /tmp/last_sync 2>/dev/null | grep -q .; then
    echo "$(date): 📦 Changes detected, auto-pushing..."
    
    # Добавляем все изменения
    git add .
    
    # Создаем коммит
    git commit -m "Auto-sync: $(date '+%Y-%m-%d %H:%M:%S')" --no-verify
    
    # Пушим без подтверждений
    git push origin main --no-verify
    
    echo "✅ Changes pushed successfully!"
    
    # Обновляем время последней синхронизации
    touch /tmp/last_sync
  fi
  
  # Ждем 5 секунд перед следующей проверкой
  sleep 5
done