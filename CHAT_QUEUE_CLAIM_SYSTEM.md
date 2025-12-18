# Chat Queue and Claim System - Implementation Summary

## ✅ Complete Implementation (Requirement #13 - 13%)

This document describes the queue and claim system for support agents, allowing them to view and claim conversations from a queue of active customer chats.

---

## 🗄️ Database Schema

### New Table: `chat_conversations`

Created in: `database/create_table_scripts/create_chat_conversations_table.sql`

**Schema:**
```sql
CREATE TABLE public.chat_conversations (
  user_id TEXT PRIMARY KEY,              -- Customer user_id (UUID or guest_*)
  claimed_by UUID REFERENCES support_agents(uid) ON DELETE SET NULL,
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Features:**
- Automatically creates conversation entries when first message is sent (via trigger)
- Tracks which agent claimed which conversation
- Tracks when conversation was claimed
- Indexes for fast lookups

**RLS Policies:**
- Support agents can view all conversations
- Support agents can claim/unclaim conversations
- Users can view their own conversation status (read-only)

---

## 🔌 API Endpoints

### 1. Claim Conversation
**POST** `/api/admin/chat/claim`

**Request:**
```json
{
  "user_id": "uuid-or-guest-id"
}
```

**Response:**
```json
{
  "success": true,
  "conversation": {
    "user_id": "...",
    "claimed_by": "agent-uuid",
    "claimed_at": "2024-01-15T10:30:00Z"
  }
}
```

**Errors:**
- `409 Conflict`: Conversation already claimed by another agent
- `403 Forbidden`: User is not a support agent
- `401 Unauthorized`: User not authenticated

---

### 2. Unclaim/Release Conversation
**POST** `/api/admin/chat/unclaim`

**Request:**
```json
{
  "user_id": "uuid-or-guest-id"
}
```

**Response:**
```json
{
  "success": true,
  "conversation": {
    "user_id": "...",
    "claimed_by": null,
    "claimed_at": null
  }
}
```

**Errors:**
- `403 Forbidden`: Can only unclaim conversations you've claimed
- `404 Not Found`: Conversation not found
- `403 Forbidden`: User is not a support agent

---

### 3. Get Conversations (with Filter)
**GET** `/api/admin/chat/conversations?filter={filter}`

**Query Parameters:**
- `filter`: `"all"` | `"unclaimed"` | `"claimed"` | `"my_claims"` (default: `"all"`)

**Response:**
```json
{
  "conversations": [
    {
      "user_id": "uuid-or-guest-id",
      "claimed_by": "agent-uuid-or-null",
      "claimed_at": "timestamp-or-null",
      "users": {
        "name": "Customer Name",
        "email": "customer@example.com"
      },
      "agent": {
        "name": "Agent Name"  // Only if claimed
      }
    }
  ]
}
```

**Features:**
- Shows all conversations that have messages (even if not in `chat_conversations` yet)
- Enriches with user profile info and agent names
- Supports filtering by claim status

---

## 🎨 Frontend UI

### Location: `app/admin/chat/page.tsx`

### Features:

1. **Filter Tabs**
   - **ALL**: Show all conversations
   - **QUEUE**: Show only unclaimed conversations (with count badge)
   - **MY CLAIMS**: Show only conversations claimed by current agent (with count badge)

2. **Conversation List**
   - Color-coded indicators:
     - 🟣 Purple: Unclaimed conversation
     - 🟢 Green: Claimed by you
     - 🟠 Orange: Claimed by another agent
   - Shows customer name and email
   - Shows claim status ("Claimed by you" / "Claimed by [agent]" / "Unclaimed")

3. **Claim/Release Buttons**
   - **CLAIM** button on unclaimed conversations
   - **RELEASE** button on conversations claimed by you
   - No button on conversations claimed by others

4. **Auto-Claim on Message**
   - When sending a message to an unclaimed conversation, it's automatically claimed
   - Prevents sending messages to conversations claimed by other agents

5. **Statistics**
   - Header shows: `X unclaimed • Y my claims • Z total`

---

## 🔄 Workflow

### For Support Agents:

1. **View Queue**
   - Open `/admin/chat`
   - Click "QUEUE" tab to see unclaimed conversations
   - Conversations are sorted by most recent activity

2. **Claim Conversation**
   - Click "CLAIM" button on an unclaimed conversation
   - Conversation moves to "MY CLAIMS" tab
   - Other agents can no longer claim it

3. **Respond to Conversation**
   - Select a claimed conversation (yours or unclaimed)
   - Send messages and attachments
   - If unclaimed, it's auto-claimed when you send first message

4. **Release Conversation**
   - Click "RELEASE" button to unclaim a conversation
   - Conversation returns to queue
   - Other agents can now claim it

---

## 🚀 Setup Instructions

### 1. Run Database Migration

Execute the SQL script in Supabase SQL Editor:

```bash
# Run this file:
database/create_table_scripts/create_chat_conversations_table.sql
```

This will:
- Create `chat_conversations` table
- Create trigger to auto-create conversation entries
- Set up RLS policies
- Create indexes

### 2. Verify API Endpoints

The API endpoints are automatically available at:
- `/api/admin/chat/claim`
- `/api/admin/chat/unclaim`
- `/api/admin/chat/conversations`

### 3. Test the System

1. **As Customer/Guest:**
   - Send messages via chat widget
   - Conversations should appear in support agent queue

2. **As Support Agent:**
   - Login to `/admin/chat`
   - See conversations in "QUEUE" tab
   - Claim a conversation
   - Send responses
   - Release conversation when done

---

## 📊 Database Queries

### Get Unclaimed Conversations:
```sql
SELECT * FROM chat_conversations 
WHERE claimed_by IS NULL 
ORDER BY updated_at DESC;
```

### Get My Claims:
```sql
SELECT * FROM chat_conversations 
WHERE claimed_by = auth.uid() 
ORDER BY updated_at DESC;
```

### Get All Conversations with User Info:
```sql
SELECT 
  cc.*,
  p.name as customer_name
FROM chat_conversations cc
LEFT JOIN profiles p ON cc.user_id = p.uid::TEXT
ORDER BY cc.updated_at DESC;
```

---

## 🔒 Security

- **RLS Policies**: Only support agents can claim/unclaim conversations
- **Authorization**: API endpoints verify user is a support agent
- **Claim Validation**: Prevents claiming already-claimed conversations
- **Release Validation**: Only allows releasing your own claims

---

## ✅ Requirements Met

- ✅ Support agents can view conversations from a queue
- ✅ Support agents can claim conversations
- ✅ Support agents can release conversations
- ✅ Queue shows unclaimed conversations
- ✅ Clear visual indicators for claim status
- ✅ Prevents multiple agents claiming same conversation
- ✅ Auto-claim when sending first message

---

## 🐛 Known Limitations

1. **No Real-time Updates**: Conversations refresh every 5 seconds (polling)
   - Future enhancement: Use Supabase Realtime subscriptions

2. **No Claim Timeout**: Claims don't expire automatically
   - Agents must manually release conversations

3. **No Claim History**: No audit log of who claimed what and when
   - Could be added with a `claim_history` table

---

## 📝 Notes

- Conversations are automatically created when first message is sent (via trigger)
- Backward compatible: Shows conversations even if not in `chat_conversations` table yet
- Guest conversations are supported (user_id starts with `guest_`)
- All claim operations are logged in console for debugging

