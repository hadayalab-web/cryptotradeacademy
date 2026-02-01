#!/usr/bin/env python3
# scripts/analyze-x-webhook-logs.py
# X Webhook ログを解析し、Account Activity API からの投稿イベントを分析

import json
import sys
from collections import defaultdict, Counter
from datetime import datetime

def analyze_webhook_logs(log_file):
    """
    X Webhook ログを解析
    
    X Account Activity API で取得可能な情報:
    - tweet_create_events: 投稿、リツイート、リプライ、@mentions、引用ツイート
    - favorite_events: いいね（by user または of user）
    - follow_events: フォロー
    - unfollow_events: アンフォロー
    - block_events / unblock_events: ブロック/解除
    - mute_events / unmute_events: ミュート/解除
    - direct_message_events: DM送受信
    - tweet_delete_events: 投稿削除通知
    """
    print(f"Loading webhook logs from {log_file}...")
    with open(log_file, 'r', encoding='utf-8') as f:
        logs = json.load(f)
    
    print(f"Total log entries: {len(logs)}\n")
    
    # イベントタイプ別の集計
    event_types = Counter()
    crc_checks = 0
    replay_jobs = []
    
    # 投稿イベント（tweet_create_events）の詳細
    tweet_creates = []
    favorites = []
    retweets = []
    
    for log in logs:
        message = log.get('message', '')
        
        # CRC チェック
        if 'CRC verification successful' in message:
            crc_checks += 1
        
        # Replay job status
        if 'replay_job_status' in message:
            try:
                # JSONから抽出
                if '{"replay_job_status"' in message:
                    start = message.index('{"replay_job_status"')
                    end = message.index('}', start) + 1
                    replay_data = json.loads(message[start:end])
                    replay_jobs.append(replay_data)
            except:
                pass
        
        # Event types detected ログから抽出
        if 'Event types detected:' in message:
            try:
                # ログから eventTypes を抽出
                if 'eventTypes:' in message:
                    start_idx = message.index('eventTypes:') + len('eventTypes:')
                    # JSON部分を抽出（カンマ区切りの配列）
                    rest = message[start_idx:].strip()
                    if rest.startswith('['):
                        end_idx = rest.index(']') + 1
                        events_str = rest[:end_idx]
                        events = json.loads(events_str.replace("'", '"'))
                        for evt in events:
                            event_types[evt] += 1
            except Exception as e:
                pass
    
    # 結果表示
    print("="*80)
    print("X Webhook ログ分析結果")
    print("="*80)
    
    print(f"\n🔐 CRC Challenge-Response Checks: {crc_checks}")
    print("  ※ X が Webhook の正当性を検証するためのチェック")
    
    print(f"\n📋 Replay Jobs: {len(replay_jobs)}")
    for job in replay_jobs:
        rj = job.get('replay_job_status', {})
        print(f"  - Job ID: {rj.get('job_id')}, State: {rj.get('job_state')}, {rj.get('job_state_description')}")
    
    print(f"\n📊 Event Types Summary:")
    if event_types:
        for evt, count in event_types.most_common():
            print(f"  {evt}: {count}")
    else:
        print("  ⚠️ イベントが検出されませんでした")
    
    print("\n" + "="*80)
    print("Account Activity API で取得可能なイベント（参考）")
    print("="*80)
    print("""
X Account Activity API から取得できる情報:
  
📝 投稿関連:
  - tweet_create_events: 投稿、RT、リプライ、@mentions、引用ツイート
  - tweet_delete_events: 投稿削除通知
  
❤️ エンゲージメント:
  - favorite_events: いいね（by user / of user）
  
👥 フォロー関係:
  - follow_events: フォロー
  - unfollow_events: アンフォロー
  - block_events / unblock_events: ブロック/解除
  - mute_events / unmute_events: ミュート/解除
  
💬 DM:
  - direct_message_events: DM送受信
  - direct_message_indicate_typing_events: 入力中通知
  - direct_message_mark_read_events: 既読通知

各イベントには以下の情報が含まれる:
  - for_user_id: サブスクリプションユーザーID
  - source: アクション実行者
  - target: アクション対象
  - created_timestamp: イベント発生時刻
  - 投稿の場合: full_text, entities (hashtags, urls, mentions), user情報
  
🔍 我々の投稿分析に役立つデータ:
  1. tweet_create_events → 投稿の full_text, entities で内容分析
  2. favorite_events → いいね数・いいねしたユーザー属性
  3. retweet (tweet_create_events内) → RT数・RTしたユーザー
  4. replies → リプライ内容・エンゲージメント傾向
  5. for_user_id → 誰の投稿に対するイベントか特定
  
これらのデータから:
  - どの投稿タイプ（スニペット/引用リポスト）が反応が良いか
  - どの時間帯が最もエンゲージメントが高いか
  - どのインフルエンサーへのリプが効果的か
  - ハッシュタグやURLの効果測定
を分析可能。
""")
    
    print("\n⚠️ 現在のログの状況:")
    print(f"  - CRC チェック: {crc_checks} 回 → Webhook 登録・検証は正常")
    print(f"  - Replay Jobs: {len(replay_jobs)} 件 → 過去イベント再配信ジョブ")
    print(f"  - tweet_create_events など: 検出されず")
    print("\n💡 投稿イベントを取得するには:")
    print("  1. X Developer Portal でサブスクリプションを追加")
    print("  2. 自アカウントまたは管理アカウントをサブスクライブ")
    print("  3. 投稿・いいね・RTなどのアクティビティが Webhook に配信される")

if __name__ == '__main__':
    log_file = sys.argv[1] if len(sys.argv) > 1 else r'c:\Users\chiba\Downloads\logs_result (2).json'
    analyze_webhook_logs(log_file)
