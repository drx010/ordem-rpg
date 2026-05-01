"use client"

import { supabase } from "../lib/supabase"
import Auth from "./Auth"
import { useEffect, useState } from "react"
import { socket } from "../lib/socket"
import DiceRoller from "./DiceRoller"
import CharacterHeader from "./CharacterHeader"
import DiceLog from "./DiceLog"
import SkillsPanel from "./SkillsPanel"

export default function CharacterSheet(){

  const [user, setUser] = useState<any>(null)
  const [selectedCharacter, setSelectedCharacter] = useState<any>(null)
  const [history, setHistory] = useState("")
  const [notes, setNotes] = useState("")

 const [defensePassive, setDefensePassive] = useState<number>(0)
 const [defenseCounter, setDefenseCounter] = useState<string>("0")
 const [defenseDodge, setDefenseDodge] = useState<string>("0")

  const [prevHP, setPrevHP] = useState<number | null>(null)
  const [damageFlash, setDamageFlash] = useState(false)
  const [shake, setShake] = useState(false)

  const [inventory, setInventory] = useState<any[]>(Array(12).fill(null))
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

 interface EquipmentItem {
  image?: string
  name?: string
  damage?: string
  crit?: string
  range?: string
  type?: string
}

const [equipment, setEquipment] = useState<{
  weapon: EquipmentItem | null
  armor: EquipmentItem | null
  accessory: EquipmentItem | null
}>({
  weapon: null,
  armor: null,
  accessory: null
})

  // 🔥 NOVO: dados editáveis do item
  const [editItem, setEditItem] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const isMaster = user?.email === "dlucascsv@gmail.com"

  const [logs, setLogs] = useState<any[]>([])
  const [roomCode, setRoomCode] = useState("")
  const [connectedRoom, setConnectedRoom] = useState("")

  useEffect(() => {
  socket.on("diceRolled", (data) => {
    setLogs(prev => [data, ...prev])
  })

  return () => {
    socket.off("diceRolled")
  }
}, [])

useEffect(() => {
  if(!selectedCharacter) return

  setHistory(selectedCharacter.history || "")
  setNotes(selectedCharacter.notes || "")
  setDefensePassive(selectedCharacter.defense_passive || 0)
  setDefenseCounter(selectedCharacter.defense_counter || 0)
  setDefenseDodge(selectedCharacter.defense_dodge || 0)

    if(prevHP !== null && selectedCharacter.hp < prevHP){
      setDamageFlash(true)
      setShake(true)

      setTimeout(()=>setDamageFlash(false), 200)
      setTimeout(()=>setShake(false), 300)
    }

    setPrevHP(selectedCharacter.hp)

  }, [selectedCharacter])

  useEffect(() => {
    if(selectedCharacter?.id){
      loadInventory(selectedCharacter.id)
    }
  }, [selectedCharacter])

  function joinRoom() {
  if (!roomCode) return

  console.log("Entrando na sala:", roomCode)

  socket.emit("joinRoom", roomCode)
  setConnectedRoom(roomCode)
}
 useEffect(() => {

  if(!selectedCharacter) return

  saveDefenseValues()

}, [defensePassive, defenseCounter, defenseDodge])

  async function loadInventory(characterId:string){
    const { data } = await supabase
      .from("inventory")
      .select("*")
      .eq("character_id", characterId)

    const slots = Array(12).fill(null)

    data?.forEach((item, index) => {
      if(index < 12){
        slots[index] = item
      }
    })

    setInventory(slots)
  }

async function handleAddItem(e:any, index:number){
  const file = e.target.files?.[0]
  if(!file || !selectedCharacter) return

  const reader = new FileReader()

  reader.onload = async () => {

    const base64 = reader.result as string

    const { data, error } = await supabase
      .from("inventory")
      .insert([{
        name: "Novo Item",
        image: base64,
        character_id: selectedCharacter.id,
        type: "item"
      }])
      .select()

    if(error){
      console.error(error)
      return
    }

    if(data && data[0]){
      const newInventory = [...inventory]
      newInventory[index] = data[0]
      setInventory(newInventory)

      // 🔥 ABRE O EDITOR AUTOMATICAMENTE
      setSelectedItem(data[0])
      setEditItem(data[0])
    }

  }

  reader.readAsDataURL(file)
}

  async function removeItem(index:number){
    const item = inventory[index]
    if(!item) return

    await supabase
      .from("inventory")
      .delete()
      .eq("id", item.id)

    const newInventory = [...inventory]
    newInventory[index] = null
    setInventory(newInventory)
  }

  function handleDrop(targetIndex:number){
    if(draggedIndex === null) return

    const newInventory = [...inventory]

    const temp = newInventory[targetIndex]
    newInventory[targetIndex] = newInventory[draggedIndex]
    newInventory[draggedIndex] = temp

    setInventory(newInventory)
    setDraggedIndex(null)
  }

  function handleSelectItem(item:any){
  if(!item) return

  setSelectedItem(item)

  // 🔒 Só mestre pode editar
  if(isMaster){
    setEditItem(item)
  } else {
    setEditItem(null)
  }
}

  function handleEquipItem(type: "weapon" | "armor" | "accessory"){
    if(!selectedItem) return

    setEquipment(prev => ({
      ...prev,
      [type]: selectedItem
    }))
  }

async function updateCharacterField(field:string, value:number){

  if(!selectedCharacter) return

  const { error } = await supabase
    .from("characters")
    .update({
      [field]: value
    })
    .eq("id", selectedCharacter.id)

  if(error){
    console.error("Erro ao atualizar:", error)
    return
  }

  setSelectedCharacter({
    ...selectedCharacter,
    [field]: value
  })
}

  async function saveItemChanges(){
    if(!editItem) return

    const { data } = await supabase
      .from("inventory")
      .update(editItem)
      .eq("id", editItem.id)
      .select()

    if(data){
      loadInventory(selectedCharacter.id)
      setSelectedItem(data[0])
    }
  }
  function handleRoll(roll:any){
  const data = {
    formula: roll.formula,
    rolls: roll.rolls,
    bonus: roll.bonus,
    total: roll.total
  }

  if(connectedRoom){
    // Só envia para sala
    socket.emit("rollDice", { roomCode: connectedRoom, data })
  } else {
    // Se não estiver em sala, adiciona localmente
    setLogs(prev => [data, ...prev])
  }
}

  async function handleLogout() {
  await supabase.auth.signOut()
  setUser(null)
}

  async function saveCharacterDetails(){

  if(!selectedCharacter) return

  const { error } = await supabase
    .from("characters")
    .update({
      history,
      notes
    })
    .eq("id", selectedCharacter.id)

  if(error){
    console.error("Erro ao salvar:", error)
  }
}
async function saveDefenseValues() {

  if(!selectedCharacter) return

  const { error } = await supabase
    .from("characters")
    .update({
      defense_passive: defensePassive,
      defense_counter: defenseCounter,
      defense_dodge: defenseDodge
    })
    .eq("id", selectedCharacter.id)

  if(error){
    console.error("Erro ao salvar defesas:", error)
  }
}
  if(!user){
    return <Auth />
  }

  return(
  <div
    className="min-h-screen relative overflow-hidden">
    {/* 🎨 FUNDO GLOBAL */}
<div className="absolute inset-0 z-0 pointer-events-none">
  <img 
    src="/background.jpg"
    className="w-full h-full object-cover opacity-20"
  />
</div>
<div className="relative z-10 p-6">
    {/* 🔓 BOTÃO LOGOUT */}
    <div className="flex justify-end mb-4">
      <button
        onClick={handleLogout}
        className="bg-sky-800 hover:bg-sky-700 px-4 py-2 rounded text-sm border border-sky-500"
      >
        Sair
      </button>
    </div>

    <CharacterHeader 
      isMaster={isMaster} 
      onSelect={setSelectedCharacter}
    />
    <div className="grid grid-cols-3 gap-6 mt-6">

        <div className="bg-zinc-900/70 backdrop-blur-sm p-4 rounded-lg border border-sky-900">
        <SkillsPanel 
  onRoll={handleRoll}
  characterId={selectedCharacter?.id}
  isMaster={isMaster}
/>
        </div>

{/* 🧍 PERSONAGEM */}
<div className={`
  relative
  p-6
  flex flex-col items-center
  min-h-[650px]
  overflow-hidden
  bg-transparent
  border-0
  ring-0
  outline-none
  shadow-none
  ${shake ? "animate-[shake_0.3s]" : ""}
  ${selectedCharacter?.sanity < selectedCharacter?.sanity_max * 0.3 ? "insanity" : ""}
`}>

  {/* MOLDURA INTERNA */}
<div className="absolute pointer-events-none" />

  <div className="relative w-124 h-178">

    {/* 🩸 SANGUE (HP BAIXO) */}
    {selectedCharacter?.hp < selectedCharacter?.hp_max * 0.3 && (
      <div className="blood-overlay z-20 animate-pulse rounded-lg"/>
    )}

    {/* 💥 FLASH DANO */}
    {damageFlash && (
      <div className="absolute inset-0 bg-sky-600/40 z-30 animate-pulse rounded-lg"/>
    )}

    {/* 🔥 BORDA DINÂMICA */}
    <div className={`
      absolute inset-0 rounded-lg border transition-all duration-300
      ${selectedCharacter?.hp < selectedCharacter?.hp_max * 0.3
        ? "border-sky-600 low-hp"
        : "border-sky-700"}
    `}/>

    {/* 🎬 IMAGEM */}
<div
  className={`
    w-full h-full overflow-hidden rounded-lg
    ${selectedCharacter?.sanity < selectedCharacter?.sanity_max * 0.3 ? "glitch" : ""}
  `}
>
  {selectedCharacter?.image ? (
    <div className="w-full h-full bg-transparent flex items-center justify-center">
      <img
        src={selectedCharacter.image}
        className="max-h-full max-w-full object-contain transition duration-500"
      />
    </div>
  ) : (
    <div className="w-full h-full flex items-center justify-center bg-transparent">
      PERSONAGEM
    </div>
  )}
</div>

    {/* 🌫️ OVERLAY */}
    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent"/>

    {/* 🧠 HUD */}
    <div className="absolute bottom-0 w-full p-3">

<div className="text-[10px] tracking-[3px] text-sky-700 mb-1">
  ARQUIVO CONFIDENCIAL
</div>

      <h2 className="
  text-sky-500 
  text-3xl 
  tracking-[6px] 
  font-extrabold 
  uppercase
  drop-shadow-[0_0_12px_rgba(56,189,248,0.6)]
">
        {selectedCharacter?.name || "Sem nome"}
      </h2>

      <p className="text-xs opacity-70 mb-2">
        {selectedCharacter?.char_class || "Sem classe"}
      </p>

      {/* ❤️ VIDA */}
<div className="mb-3">

  <div className="flex justify-between text-xs mb-1">
    <span>HP</span>

    <div className="flex items-center gap-1">

      {/* Valor atual */}
      <input
        type="number"
        value={selectedCharacter?.hp || 0}
        onChange={(e)=>updateCharacterField("hp", Number(e.target.value))}
        className="w-12 bg-black border border-sky-700 text-center rounded"
      />

      <span>/</span>

      {/* Valor máximo */}
      <input
        type="number"
        value={selectedCharacter?.hp_max || 0}
        onChange={(e)=>updateCharacterField("hp_max", Number(e.target.value))}
        className="w-12 bg-black border border-sky-500 text-center rounded"
      />

    </div>
  </div>

  <div className="
  h-4
  bg-zinc-950
  border border-sky-900
  relative
  overflow-hidden
  rounded-sm
">
  <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(90deg,transparent,transparent_8px,rgba(0, 119, 255, 0.4)_9px)]"/>
    <div
  className="h-full bg-sky-700 transition-all duration-500"
      style={{
        width: `${(selectedCharacter?.hp / selectedCharacter?.hp_max) * 100}%`
      }}
    />
  </div>

</div>

      {/* 🧠 SANIDADE */}
      <div className="mb-2 h-3 bg-zinc-950 border border-blue-900 overflow-hidden rounded-sm relative">
        <div className={`
          h-full bg-blue-500 transition-all
          ${selectedCharacter?.sanity < selectedCharacter?.sanity_max * 0.3 ? "animate-pulse" : ""}
        `}
          style={{ width: `${(selectedCharacter?.sanity / selectedCharacter?.sanity_max) * 100 || 0}%` }}
        />
      </div>

      {/* ⚡ ENERGIA */}
      <div className="h-3 bg-zinc-950 border border-yellow-900 overflow-hidden rounded-sm relative">
        <div className={`
          h-full bg-yellow-400 transition-all
          ${selectedCharacter?.energy < selectedCharacter?.energy_max * 0.3 ? "low-energy" : ""}
        `}
          style={{ width: `${(selectedCharacter?.energy / selectedCharacter?.energy_max) * 100 || 0}%` }}
        />
      </div>

    </div>

{/* 🛡️ DEFESAS */}
<div className="mt-6 relative">

  {/* LINHA DECORATIVA */}
  <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-red-700 to-transparent"/>

  <h3 className="text-red-600 text-xs tracking-[4px] text-center mt-4 mb-3">
    MODIFICADORES DE DEFESA
  </h3>

  <div className="grid grid-cols-3 gap-4">

    {/* PASSIVA */}
    <div className="relative group">
      <div className="absolute inset-0 rounded-xl bg-red-700/10 blur-md group-hover:bg-red-700/20 transition"/>
      
      <div className="relative bg-black border border-red-800 rounded-xl p-4 text-center
        group-hover:border-red-500 transition-all duration-300">

        <p className="text-[10px] tracking-widest text-red-400 uppercase mb-2">
          Defesa Passiva
        </p>

        <input
          type="number"
          value={defensePassive}
          onChange={(e)=>setDefensePassive(Number(e.target.value))}
          className="w-full bg-transparent text-center text-3xl font-bold text-red-500
            outline-none appearance-none"
        />

      </div>
    </div>

    {/* CONTRA-ATAQUE */}
    <div className="relative group">
      <div className="absolute inset-0 rounded-xl bg-yellow-600/10 blur-md group-hover:bg-yellow-600/20 transition"/>
      
      <div className="relative bg-black border border-yellow-700 rounded-xl p-4 text-center
        group-hover:border-yellow-400 transition-all duration-300">

        <p className="text-[10px] tracking-widest text-yellow-400 uppercase mb-2">
          Contra-Ataque
        </p>

        <input
  type="text"
  value={defenseCounter}
  onChange={(e)=>{
    const value = e.target.value

    // permite apenas + - e números
    if (/^[+-]?\d*$/.test(value)) {
      setDefenseCounter(value)
    }
  }}
  className="w-full bg-transparent text-center text-3xl font-bold text-yellow-400
    outline-none"
/>
      </div>
    </div>

    {/* ESQUIVA */}
    <div className="relative group">
      <div className="absolute inset-0 rounded-xl bg-blue-600/10 blur-md group-hover:bg-blue-600/20 transition"/>
      
      <div className="relative bg-black border border-blue-700 rounded-xl p-4 text-center
        group-hover:border-blue-400 transition-all duration-300">

        <p className="text-[10px] tracking-widest text-blue-400 uppercase mb-2">
          Esquiva
        </p>

        <input
  type="text"
  value={defenseDodge}
  onChange={(e)=>{
    const value = e.target.value

    if (/^[+-]?\d*$/.test(value)) {
      setDefenseDodge(value)
    }
  }}
  className="w-full bg-transparent text-center text-3xl font-bold text-blue-400
    outline-none"
/>

      </div>
    </div>

  </div>
</div>

    {/* 📖 HISTÓRIA */}
<div className="w-full mt-4">
  <h3 className="text-sky-500 text-sm mb-1">História</h3>
<textarea
  rows={5}
  value={history}
  onChange={(e)=>{
    setHistory(e.target.value)
  }}
  onBlur={saveCharacterDetails}
    placeholder="Conte a história do personagem..."
    className="w-full bg-black border border-sky-800 rounded p-2 text-xs resize-none focus:outline-none focus:border-sky-500"
  />
</div>

{/* 🧠 OBSERVAÇÕES */}
<div className="w-full mt-3">
  <h3 className="text-sky-500 text-sm mb-1">Observações / Descrição</h3>
<textarea
  rows={5}
  value={notes}
  onChange={(e)=>{
    setNotes(e.target.value)
  }}
  onBlur={saveCharacterDetails}
    placeholder="Detalhes, personalidade, anotações..."
    className="w-full bg-black border border-sky-800 rounded p-2 text-xs resize-none focus:outline-none focus:border-sky-500"
  />
</div>

  </div>
</div>

{/* INVENTÁRIO */}
<div className="absolute inset-0 pointer-events-none opacity-10 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0, 102, 255, 0.2)_3px)]"/>
<div className="
  bg-gradient-to-b from-zinc-950/80 to-black/80 backdrop-blur-sm
  p-5
  rounded-2xl
  border-2 border-sky-800
  shadow-[0_0_12px_rgba(56,189,248,0.6)]
  relative
  overflow-hidden
">

  {/* EQUIPAMENTOS */}
  <div className="mb-4 grid grid-cols-3 gap-2">
    <div className="bg-black border border-sky-700 p-2 text-center">
      <p className="text-xs text-sky-400">ARMA</p>
      {equipment.weapon && <img src={equipment.weapon.image} className="h-12 mx-auto object-contain"/>}
    </div>

    <div className="bg-black border border-blue-700 p-2 text-center">
      <p className="text-xs text-blue-400">ARMADURA</p>
      {equipment.armor && <img src={equipment.armor.image} className="h-12 mx-auto object-contain"/>}
    </div>

    <div className="bg-black border border-purple-700 p-2 text-center">
      <p className="text-xs text-purple-400">ACESSÓRIO</p>
      {equipment.accessory && <img src={equipment.accessory.image} className="h-12 mx-auto object-contain"/>}
    </div>
  </div>

{/* ITEM SELECIONADO */}
<div className="
  w-full aspect-square mb-5
  bg-gradient-to-br from-zinc-950 to-black
  border-2 border-sky-800
  rounded-2xl
  relative
  overflow-hidden
  shadow-[0_0_12px_rgba(56,189,248,0.6)]
">

  {selectedItem && (
    <>
      {/* IMAGEM */}
      <img 
        src={selectedItem.image} 
        className="w-full h-full object-contain p-4"
      />

      {/* BOTÕES EQUIPAR */}
      <div className="absolute top-2 right-2 flex flex-col gap-1">
        <button onClick={()=>handleEquipItem("weapon")} className="bg-sky-700 px-2 text-xs">Arma</button>
        <button onClick={()=>handleEquipItem("armor")} className="bg-blue-700 px-2 text-xs">Armadura</button>
        <button onClick={()=>handleEquipItem("accessory")} className="bg-purple-700 px-2 text-xs">Acessório</button>
      </div>

      {/* NOME */}
      <div className="
  absolute bottom-3 left-0 w-full
  text-center
  text-sky-500
  font-bold
  tracking-widest
  uppercase
  text-sm
  shadow-[0_0_12px_rgba(56,189,248,0.6)]
  z-10
">
        {selectedItem.name}
      </div>

      {/* 🔥 HUD DE ESPECIFICAÇÕES */}
      <div className="
  absolute bottom-3 right-3
  text-[10px]
  text-right
  bg-zinc-900/95
  px-3 py-2
  rounded-lg
  border border-sky-800
  shadow-[0_0_12px_rgba(56,189,248,0.6)]
  font-mono
">

        <p className="text-sky-400 uppercase">
          {selectedItem.type || "item"}
        </p>

        {selectedItem.type === "weapon" && (
          <>
            {selectedItem.damage && (
              <p>⚔ {selectedItem.damage}</p>
            )}
            {selectedItem.crit && (
              <p>💥 {selectedItem.crit}</p>
            )}
            {selectedItem.range && (
              <p>🎯 {selectedItem.range}</p>
            )}
          </>
        )}

      </div>

    </>
  )}

</div>

  {/* 🔥 PAINEL DE EDIÇÃO */}
  {editItem && isMaster && (
    <div className="mb-4 space-y-2 text-xs">

      <input
        value={editItem.name || ""}
        onChange={(e)=>setEditItem({...editItem, name: e.target.value})}
        className="w-full bg-black p-2 border border-sky-700"
        placeholder="Nome"
      />

      <select
        value={editItem.type || "item"}
        onChange={(e)=>setEditItem({...editItem, type: e.target.value})}
        className="w-full bg-black p-2 border border-sky-700"
      >
        <option value="item">Item</option>
        <option value="weapon">Arma</option>
      </select>

      {editItem.type === "weapon" && (
        <>
          <input placeholder="Dano" className="w-full bg-black p-2 border border-sky-700"
            value={editItem.damage || ""}
            onChange={(e)=>setEditItem({...editItem, damage: e.target.value})}
          />
          <input placeholder="Crítico" className="w-full bg-black p-2 border border-sky-700"
            value={editItem.crit || ""}
            onChange={(e)=>setEditItem({...editItem, crit: e.target.value})}
          />
          <input placeholder="Alcance" className="w-full bg-black p-2 border border-sky-700"
            value={editItem.range || ""}
            onChange={(e)=>setEditItem({...editItem, range: e.target.value})}
          />
        </>
      )}

      <button
        onClick={saveItemChanges}
        className="w-full bg-green-700 p-2"
      >
        Salvar
      </button>

    </div>
  )}

  {/* GRID */}
  <div className="grid grid-cols-4 gap-3">

    {inventory.map((item, index)=>(

      <div
        key={index}
        draggable={!!item}
        onDragStart={()=>setDraggedIndex(index)}
        onDragOver={(e)=>e.preventDefault()}
        onDrop={()=>handleDrop(index)}
        onContextMenu={(e)=>{
  e.preventDefault()
  if(isMaster){
    removeItem(index)
  }
}}
        onClick={()=>handleSelectItem(item)}
        className={`
  relative aspect-square flex items-center justify-center
  rounded-xl
  bg-gradient-to-br from-zinc-900 to-black
  transition-all duration-200
  ${selectedItem === item
    ? "border-2 border-sky-500 scale-105 shadow-[0_0_12px_rgba(56,189,248,0.6)]"
    : "border border-sky-900 hover:border-sky-600 hover:shadow-[0_0_12px_rgba(56,189,248,0.6)"}
`}
      >

        {item ? (
          <img src={item.image} className="w-full h-full object-contain p-2"/>
        ) : "+"}

        {isMaster && (
  <input
    type="file"
    className="absolute inset-0 opacity-0"
    onChange={(e)=>handleAddItem(e, index)}
  />
)}

      </div>

    ))}

  </div>

</div>

      </div>
      
      {/* 🎲 Sala Multiplayer */}
<div className="mb-4 flex gap-2 items-center">
  <input
    value={roomCode}
    onChange={(e)=>setRoomCode(e.target.value)}
    placeholder="Código da sala"
    className="bg-black border border-purple-700 p-2 text-sm"
  />

  <button
    onClick={joinRoom}
    className="bg-purple-700 px-3 py-2 text-sm rounded"
  >
    Entrar na sala
  </button>

  {connectedRoom && (
    <span className="text-purple-400 text-xs">
      Conectado: {connectedRoom}
    </span>
  )}
</div>

{/* 🎲 Rolagem */}
<DiceRoller onRoll={handleRoll} />

{/* 📜 Histórico */}
<DiceLog logs={logs} />
  
    </div>
  </div>
  )
}