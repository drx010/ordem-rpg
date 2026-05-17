"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "../lib/supabase"

export default function CharacterHeader({ isMaster, onSelect }: any){

  const hitSound = useRef<any>(null)
  const healSound = useRef<any>(null)

  const [flash, setFlash] = useState(false)

  const [name, setName] = useState("")
  const [charClass, setCharClass] = useState("")
  const [image, setImage] = useState("")
  const [nex, setNex] = useState(0)

  const [hp, setHp] = useState(30)
  const [hpMax, setHpMax] = useState(30)

  const [sanity, setSanity] = useState(100)
  const [sanityMax, setSanityMax] = useState(100)

  const [energy, setEnergy] = useState(50)
  const [energyMax, setEnergyMax] = useState(50)

  const [characters, setCharacters] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(()=>{
    if(user) loadCharacters()
  },[user])

  async function loadCharacters(){
  if(!user) return

  const { data } = await supabase
    .from("characters")
    .select("*")
    .order("id",{ascending:false})

  setCharacters(data || [])
}

  function selectCharacter(char:any){
    setSelectedId(char.id)

    setName(char.name || "")
    setCharClass(char.char_class || "")
    setImage(char.image || "")
    setNex(char.nex ?? 0)

    setHp(char.hp ?? 30)
    setHpMax(char.hp_max ?? 30)
    setSanity(char.sanity ?? 100)
    setSanityMax(char.sanity_max ?? 100)
    setEnergy(char.energy ?? 50)
    setEnergyMax(char.energy_max ?? 50)

    onSelect && onSelect(char)
  }

 useEffect(() => {
  if (!selectedId) return

  const channel = supabase
    .channel(`character-${selectedId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "characters",
        filter: `id=eq.${selectedId}`
      },
      (payload) => {
        console.log("Realtime recebido:", payload)

        const updated = payload.new as any
        if (!updated) return

        setHp(updated.hp)
        setHpMax(updated.hp_max)

        setSanity(updated.sanity)
        setSanityMax(updated.sanity_max)

        setEnergy(updated.energy)
        setEnergyMax(updated.energy_max)
      }
    )
    .subscribe((status) => {
      console.log("Status do canal:", status)
    })

  return () => {
    supabase.removeChannel(channel)
  }
}, [selectedId])

  async function saveCharacter(){
    if(!user){
      alert("Usuário não logado!")
      return
    }

    const payload = {
      name,
      char_class: charClass,
      image,
      nex,
      hp,
      hp_max: hpMax,
      sanity,
      sanity_max: sanityMax,
      energy,
      energy_max: energyMax,
      user_id: user.id
    }

    if(selectedId){
      await supabase.from("characters").update(payload).eq("id", selectedId)
    }else{ 
      const { data } = await supabase.from("characters").insert([payload]).select()

      if(data && data[0]){
        setSelectedId(data[0].id)
        onSelect && onSelect(data[0])
      }
    }

    loadCharacters()
  }

  async function uploadImage(e:any){
    const file = e.target.files[0]
    if(!file || !user || !selectedId) return

    const fileName = `${Date.now()}-${file.name}`

    const { error } = await supabase.storage.from("avatars").upload(fileName, file)

    if(error){
      alert("Erro upload")
      return
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(fileName)
    const url = data.publicUrl

    setImage(url)

    await supabase.from("characters").update({ image: url }).eq("id", selectedId) 

    loadCharacters()
  }

  function playSound(type:"hit"|"heal"){
    const s = type === "hit" ? hitSound.current : healSound.current
    if(s){
      s.currentTime = 0
      s.play()
    }
  }

  function triggerFlash(){
    setFlash(true)
    setTimeout(()=>setFlash(false),150)
  }

  function changeHp(amount:number){
    setHp(prev=>{
      let v = Math.max(0, Math.min(prev + amount, hpMax))
      amount < 0 ? (playSound("hit"), triggerFlash()) : playSound("heal")

      if(selectedId){
        supabase.from("characters").update({ hp: v }).eq("id", selectedId)
        
      }

      return v
    })
  }

  function changeSanity(amount:number){
    setSanity(prev=>{
      let v = Math.max(0, Math.min(prev + amount, sanityMax))
      amount < 0 ? playSound("hit") : playSound("heal")

      if(selectedId){
        supabase.from("characters").update({ sanity: v }).eq("id", selectedId)
        
      }

      return v
    })
  }

  function changeEnergy(amount:number){
    setEnergy(prev=>{
      let v = Math.max(0, Math.min(prev + amount, energyMax))
      amount < 0 ? playSound("hit") : playSound("heal")

      if(selectedId){
        supabase.from("characters").update({ energy: v }).eq("id", selectedId)
        
      }

      return v
    })
  }

  function Bar({ value, max, color }: { value: number, max: number, color: string }) {

  const percentage = max > 0 ? (value / max) * 100 : 0

  return (
    <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden shadow-inner">
      <div
        className={`h-3 rounded-full transition-all duration-300`}
        style={{
          width: `${percentage}%`,
          backgroundColor: color
        }}
      />
    </div>
  )
}
  function ControlButton({onClick, children, color}:any){
    return(
      <button
        onClick={onClick}
        className={`px-2 py-1 rounded text-xs transition-all duration-200
        ${color}
        hover:scale-110 hover:brightness-125 active:scale-95`}
      >
        {children}
      </button>
    )
  }

  return(
    <div className={`bg-black/60 p-4 rounded-lg border border-zinc-700 ${flash ? "bg-red-900/40" : ""}`}>
      

      <audio ref={hitSound} src="/hit.mp3"/> 

      {/* PERSONAGENS */}
      <div className="mb-4 flex gap-2 flex-wrap">
        {characters.map((char)=>(
          <div key={char.id} onClick={()=>selectCharacter(char)}
            className={`p-2 border cursor-pointer text-sm ${
              selectedId===char.id?"border-white-500":"border-zinc-700"
            }`}>
            {char.name}
          </div>
        ))}
      </div>

      {/* INPUTS */}
      <div className="grid grid-cols-3 gap-3 mb-3">

  {/* Nome */}
  <div>
    <label className="text-xs text-zinc-400">Nome</label>
    <input
      value={name}
      onChange={(e)=>setName(e.target.value)}
      className="bg-black border border-zinc-700 p-2 w-full rounded text-sm focus:border-white-500 focus:outline-none"
    />
  </div>

  {/* Classe */}
  <div>
    <label className="text-xs text-zinc-400">Classe</label>
    <input
      value={charClass}
      onChange={(e)=>setCharClass(e.target.value)}
      className="bg-black border border-yellow-700 p-2 w-full rounded text-sm text-yellow-400 focus:border-yellow-500 focus:outline-none"
    />
  </div>

  {/* NEX */}
  <div>
    <label className="text-xs text-zinc-400">NEX</label>
    <div className="relative">
      <input
        type="number"
        value={nex}
        onChange={(e)=>setNex(Number(e.target.value))}
        className="bg-black border border-purple-800 p-2 w-full rounded text-sm text-purple-400 font-bold focus:border-purple-500 focus:outline-none"
      />
      <span className="absolute right-2 top-2 text-purple-500 text-sm font-bold">
        %
      </span>
    </div>
  </div>

</div>

      <input type="file" onChange={uploadImage} className="mb-2"/>

      <button onClick={saveCharacter}
        className="bg-green-600 px-3 py-1 mb-4 rounded w-full hover:bg-green-500">
        Salvar personagem
      </button>

     {/* ================= HUD HORIZONTAL FULL WIDTH ================= */}
<div className="mt-6 w-full">
  <div className="flex w-full gap-4">

    {/* ❤️ VIDA */}
    <div className="flex-1 min-w-0">
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-red-400 uppercase tracking-wider">Vida</span>
        <span className="font-semibold">{hp}/{hpMax}</span>
      </div>

      <Bar value={hp} max={hpMax} color="#ef4444"/>

      <div className="flex justify-between mt-2 text-[10px]">
        <div className="flex gap-1">
          <ControlButton onClick={()=>changeHp(-5)} color="bg-red-900">-5</ControlButton>
          <ControlButton onClick={()=>changeHp(-1)} color="bg-red-700">-1</ControlButton>
        </div>
        <div className="flex gap-1">
          <ControlButton onClick={()=>changeHp(1)} color="bg-green-700">+1</ControlButton>
          <ControlButton onClick={()=>changeHp(5)} color="bg-green-900">+5</ControlButton>
        </div>
      </div>
    </div>

    {/* 🧠 SANIDADE */}
    <div className="flex-1 min-w-0">
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-blue-400 uppercase tracking-wider">Sanidade</span>
        <span className="font-semibold">{sanity}/{sanityMax}</span>
      </div>

      <Bar value={sanity} max={sanityMax} color="#3b82f6"/>

      <div className="flex justify-between mt-2 text-[10px]">
        <div className="flex gap-1">
          <ControlButton onClick={()=>changeSanity(-5)} color="bg-blue-900">-5</ControlButton>
          <ControlButton onClick={()=>changeSanity(-1)} color="bg-blue-700">-1</ControlButton>
        </div>
        <div className="flex gap-1">
          <ControlButton onClick={()=>changeSanity(1)} color="bg-green-700">+1</ControlButton>
          <ControlButton onClick={()=>changeSanity(5)} color="bg-green-900">+5</ControlButton>
        </div>
      </div>
    </div>

    {/* ⚡ ENERGIA */}
    <div className="flex-1 min-w-0">
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-yellow-400 uppercase tracking-wider">Energia</span>
        <span className="font-semibold">{energy}/{energyMax}</span>
      </div>

      <Bar value={energy} max={energyMax} color="#eab308"/>

      <div className="flex justify-between mt-2 text-[10px]">
        <div className="flex gap-1">
          <ControlButton onClick={()=>changeEnergy(-5)} color="bg-yellow-900">-5</ControlButton>
          <ControlButton onClick={()=>changeEnergy(-1)} color="bg-yellow-700">-1</ControlButton>
        </div>
        <div className="flex gap-1">
          <ControlButton onClick={()=>changeEnergy(1)} color="bg-green-700">+1</ControlButton>
          <ControlButton onClick={()=>changeEnergy(5)} color="bg-green-900">+5</ControlButton>
        </div>
      </div>
    </div> 

       </div>
     </div>
    </div> 
  )
}