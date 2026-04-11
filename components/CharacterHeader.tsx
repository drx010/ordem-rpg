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

    setHp(char.hp ?? 30)
    setHpMax(char.hp_max ?? 30)
    setSanity(char.sanity ?? 100)
    setSanityMax(char.sanity_max ?? 100)
    setEnergy(char.energy ?? 50)
    setEnergyMax(char.energy_max ?? 50)

    onSelect && onSelect(char)
  }

  function updateHUD(extra:any){
    if(selectedId){
      onSelect && onSelect({
        id: selectedId,
        name,
        char_class: charClass,
        image,
        hp,
        hp_max: hpMax,
        sanity,
        sanity_max: sanityMax,
        energy,
        energy_max: energyMax,
        ...extra
      })
    }
  }

  async function saveCharacter(){
    if(!user){
      alert("Usuário não logado!")
      return
    }

    const payload = {
      name,
      char_class: charClass,
      image,
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
      updateHUD({})
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

    updateHUD({ image: url })

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
        updateHUD({ hp: v })
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
        updateHUD({ sanity: v })
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
        updateHUD({ energy: v })
      }

      return v
    })
  }

  function Bar({value,max,color}:{value:number,max:number,color:string}){
    return(
      <div className="w-full bg-zinc-800 h-4 rounded overflow-hidden">
        <div
          className={`h-4 transition-all duration-300 ${flash ? "opacity-70" : ""}`}
          style={{
            width: `${(value/max)*100}%`,
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
    <div className={`bg-zinc-900 p-4 rounded-lg border border-sky-900 ${flash ? "bg-sky-900/40" : ""}`}>

      <audio ref={hitSound} src="/hit.mp3"/>
      <audio ref={healSound} src="/heal.mp3"/>

      {/* PERSONAGENS */}
      <div className="mb-4 flex gap-2 flex-wrap">
        {characters.map((char)=>(
          <div key={char.id} onClick={()=>selectCharacter(char)}
            className={`p-2 border cursor-pointer text-sm ${
              selectedId===char.id?"border-sky-500":"border-zinc-700"
            }`}>
            {char.name}
          </div>
        ))}
      </div>

      {/* INPUTS */}
      <input value={name} onChange={(e)=>setName(e.target.value)}
        placeholder="Nome"
        className="mb-2 bg-black border p-1 w-full"/>

      <input value={charClass} onChange={(e)=>setCharClass(e.target.value)}
        placeholder="Classe"
        className="mb-2 bg-black border p-1 w-full"/>

      <input type="file" onChange={uploadImage} className="mb-2"/>

      <button onClick={saveCharacter}
        className="bg-green-600 px-3 py-1 mb-4 rounded w-full hover:bg-green-500">
        Salvar personagem
      </button>
      {/* ❤️ HP */}
      <p className="text-sky-400 text-sm">HP {hp}/{hpMax}</p>
      {isMaster && (
  <input
    type="number"
    value={hpMax}
    onChange={(e)=>{
      const value = Number(e.target.value)
      setHpMax(value)

      if(selectedId){
        supabase.from("characters")
          .update({ hp_max: value })
          .eq("id", selectedId)

        updateHUD({ hp_max: value })
      }
    }}
    className="mb-2 w-20 bg-black border border-sky-800 p-1 text-xs"
  />
)}
      <Bar value={hp} max={hpMax} color="red"/>
      <div className="flex gap-2 mt-2 mb-3">
        <ControlButton onClick={()=>changeHp(-5)} color="bg-sky-900">-5</ControlButton>
        <ControlButton onClick={()=>changeHp(-1)} color="bg-sky-700">-1</ControlButton>
        <ControlButton onClick={()=>changeHp(1)} color="bg-green-700">+1</ControlButton>
        <ControlButton onClick={()=>changeHp(5)} color="bg-green-900">+5</ControlButton>
      </div>

      {/* 🧠 SANIDADE */}
      <p className="text-blue-400 text-sm">Sanidade {sanity}/{sanityMax}</p>
      {isMaster && (
  <input
    type="number"
    value={sanityMax}
    onChange={(e)=>{
      const value = Number(e.target.value)
      setSanityMax(value)

      if(selectedId){
        supabase.from("characters")
          .update({ sanity_max: value })
          .eq("id", selectedId)

        updateHUD({ sanity_max: value })
      }
    }}
    className="mb-2 w-20 bg-black border border-blue-800 p-1 text-xs"
  />
)}
      <Bar value={sanity} max={sanityMax} color="blue"/>
      <div className="flex gap-2 mt-2 mb-3">
        <ControlButton onClick={()=>changeSanity(-5)} color="bg-blue-900">-5</ControlButton>
        <ControlButton onClick={()=>changeSanity(-1)} color="bg-blue-700">-1</ControlButton>
        <ControlButton onClick={()=>changeSanity(1)} color="bg-green-700">+1</ControlButton>
        <ControlButton onClick={()=>changeSanity(5)} color="bg-green-900">+5</ControlButton>
      </div>

      {/* ⚡ ENERGIA */}
<p className="text-yellow-400 text-sm">
  Energia {energy}/{energyMax}
</p>

{isMaster && (
  <input
    type="number"
    value={energyMax}
    onChange={(e)=>{
      const value = Number(e.target.value)
      setEnergyMax(value)

      if(selectedId){
        supabase.from("characters")
          .update({ energy_max: value })
          .eq("id", selectedId)

        updateHUD({ energy_max: value })
      }
    }}
    className="mb-2 w-20 bg-black border border-yellow-800 p-1 text-xs"
  />
)}

<Bar value={energy} max={energyMax} color="yellow"/>

      <div className="flex gap-2 mt-2 mb-3">
        <ControlButton onClick={()=>changeEnergy(-5)} color="bg-yellow-900">-5</ControlButton>
        <ControlButton onClick={()=>changeEnergy(-1)} color="bg-yellow-700">-1</ControlButton>
        <ControlButton onClick={()=>changeEnergy(1)} color="bg-green-700">+1</ControlButton>
        <ControlButton onClick={()=>changeEnergy(5)} color="bg-green-900">+5</ControlButton>
      </div>

    </div>

  )
}