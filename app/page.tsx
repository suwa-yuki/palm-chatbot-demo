'use client'

import React, { useState, useEffect } from 'react'
import { Input, Button, Fab, List, ListItemButton, ListItemText, CircularProgress } from '@mui/material'
import { Add, Send, SmartToy } from '@mui/icons-material'
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, query, orderBy, limit, doc, addDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'

const firebaseConfig = {
  projectId: "<Firebase Project ID>",
  apiKey: "<API Key>",
}
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

let unsubscribe: any

export default function Home() {
  const [prompt, setPrompt] = useState('')
  const [threads, setThreads] = useState<any[]>([])
  const [currentThreadId, setCurrentThreadId] = useState<string>('')
  const [messages, setMessages] = useState<any[]>([])

  useEffect(() => {
    const threadsQuery = query(collection(db, 'threads'), orderBy('createdAt', 'desc'), limit(8))
    onSnapshot(threadsQuery, (snapshot) => {
      const t: any[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        t.push(data)
      })
      setThreads([...threads, ...t])
      if (currentThreadId == '') {
        const thread = t[0]
        console.log(thread)
        switchThread(thread.threadId)
      }
    })
  }, [])

  const style = {
    width: '100%',
    minWidth: 240,
  }

  const addThread = async () => {
    const newThread = doc(collection(db, 'threads'))
    await setDoc(newThread, { threadId: newThread.id, createdAt: serverTimestamp() })
    switchThread(newThread.id)
  }

  const sendPrompt = async () => {
    const data = { prompt }
    const c = collection(db, 'threads', currentThreadId, 'messages')
    setMessages([...[data], ...messages])
    await addDoc(c, data)
    setPrompt('')
  }

  const switchThread = (threadId: string) => {
    if (unsubscribe) {
      unsubscribe()
    }
    setMessages([])
    setCurrentThreadId(threadId)
    const messagesQuery = query(collection(db, 'threads', threadId, 'messages'), orderBy('createTime', 'desc'))
    unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const m: any[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        m.push(data)
      })
      setMessages([...m])
    })
  }

  return (
    <main className='w-full h-screen flex bg-white dark:bg-gray-900'>
      <div className='threads-list py-4'>
        <div className='px-4 pb-2'>
          <Fab className='fab' sx={{ boxShadow: 0 }} onClick={ addThread } variant='extended' color='primary'>
            <Add/>
            新規作成
          </Fab>
        </div>
        <List sx={style} component='nav'>
          {
            threads.map((t: any) => {
              const title = t.createdAt ? t.createdAt.toDate().toLocaleString('jp-JA') : new Date().toISOString()
              return (
              <ListItemButton
                key={ t.threadId } 
                onClick={ () => switchThread(t.threadId) } 
                selected={ t.threadId == currentThreadId }
                divider>
                <ListItemText primary={ title } secondary={ t.threadId } />
              </ListItemButton>
              )
            })
          }
        </List>
      </div>
      <div className='message-container mr-4 my-4 p-8 grow flex flex-col-reverse rounded-[20px] bg-gray-100 dark:bg-gray-800'>
        <div className='chat-container flex mt-8 pl-8 pr-4 py-4 rounded-full bg-white dark:bg-gray-950'>
          <Input
            className="grow dark:text-white"
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <Button className='rounded-full' onClick={sendPrompt}><Send /></Button>
        </div>
        <div className='chat-history w-full flex flex-col-reverse overflow-auto'>
          {
            messages.map((m: any) => {
              const key = JSON.stringify(m)
              return <div className='flex flex-col' key={ key }>
                <div className='prompt p-4'>{ m.prompt }</div>
                <div className='response flex bg-gray-200 dark:bg-gray-900 p-4 rounded-[20px]'>
                  <SmartToy className='mr-4' />
                  { 
                    m.response ? m.response : <CircularProgress size='1.5rem' />
                  }
                </div>
              </div>
            })
          }
        </div>
      </div>
    </main>
  )
}
