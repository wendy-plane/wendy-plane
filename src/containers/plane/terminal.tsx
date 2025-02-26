import { produce } from "immer"
import { useCallback, useEffect, useRef, useState } from "react"

import "./styles/plane.css"
import { event } from "../../common/bus"
import { Console } from "../../api/console"

interface TerminalProps {
  id: number
  selected: number
}
export function Terminal(props: TerminalProps) {
  const { id, selected } = props
  const [real, setReal] = useState<boolean>(true)
  const [log, setLog] = useState<string[]>([])
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const key = `${id}_${selected}`
    const handleNewLog = (message: string) => {
      setLog((prevLog) => {
        const newLog = [...prevLog, message]
        return newLog.slice(-1000)
      })
    }
    event.on(key, handleNewLog)
    return () => {
      event.off(key, handleNewLog)
    }
  }, [id, selected])
  useEffect(() => {
    if (ref && ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight
    }
  }, [log])
  return (
    <>
      <div className="terminal-box">
        <div className="terminal-nav">
          <div
            onClick={() => {
              setReal(true)
            }}
            className="terminal-nav-item"
            style={{ color: real ? "#fff" : "#666" }}
          >
            实时日志
          </div>
          <div
            className="terminal-nav-item"
            style={{ color: real ? "#666" : "#fff" }}
            onClick={() => {
              setReal(false)
            }}
          >
            历史日志
          </div>
        </div>
        {real ? (
          <RealTimeLog id={id} selected={selected}></RealTimeLog>
        ) : (
          <HistoryLog id={id} selected={selected}></HistoryLog>
        )}
      </div>
      <Command id={id} selected={selected}></Command>
    </>
  )
}

function RealTimeLog(props: TerminalProps) {
  const { id, selected } = props
  const [log, setLog] = useState<Record<string, string[]>>({})
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const key = `${id}_${selected}`
    const handleNewLog = (message: string) => {
      setLog(
        produce((draft) => {
          const _log = draft[key] || []
          _log.push(message)
          draft[key] = _log.slice(-1000)
        })
      )
    }
    event.on(key, handleNewLog)
    return () => {
      event.off(key, handleNewLog)
    }
  }, [id, selected])
  useEffect(() => {
    if (ref && ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight
    }
  }, [log, selected])
  return (
    <div className="terminal-outer">
      <div className="terminal" ref={ref}>
        {log[`${id}_${selected}`]?.map((line, index) => {
          return <div key={index}>{line}</div>
        })}
      </div>
    </div>
  )
}

function HistoryLog(props: TerminalProps) {
  const { id, selected } = props
  const [log, setLog] = useState<string[]>([])
  const ref = useRef<HTMLDivElement | null>(null)
  const init = useCallback(async () => {
    const newLogs = await Console.tail({
      id,
      count: 1000,
      tail: 1000,
      world_index: selected
    })
    setLog(newLogs)
  }, [id, selected])
  useEffect(() => {
    init()
  }, [init])
  useEffect(() => {
    if (ref && ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight
    }
  }, [log])
  return (
    <div className="terminal-outer">
      <div className="terminal" ref={ref}>
        {log.map((line, index) => (
          <div key={index}>{line}</div>
        ))}
      </div>
    </div>
  )
}

function Command(props: TerminalProps) {
  const { id, selected } = props
  const run_command = async (command: string) => {
    await Console.command(id, {
      command: command,
      world_index: selected
    })
  }
  return (
    <div className="command-box">
      <div className="command-item" onClick={() => run_command("c_rollback(3)")}>
        回滚1天
      </div>
      <div className="command-item" onClick={() => run_command("c_regenerateshard()")}>
        重置世界
      </div>
      <div className="command-item" onClick={() => run_command("c_save()")}>
        保存存档
      </div>
      <div className="command-item" onClick={() => run_command("c_listallplayers()")}>
        在线玩家
      </div>
      <input
        className="command-input"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const target = e.target as HTMLInputElement
            run_command(target.value)
            target.value = ""
          }
        }}
        type="text"
        placeholder="输入控制台指令"
      />
    </div>
  )
}
