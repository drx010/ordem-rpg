"use client"

import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"

export default function SkillsPanel({
  onRoll,
  characterId,
  isMaster
}: {
  onRoll: any,
  characterId: string,
  isMaster: boolean
}) {

  // 🎯 ESTADO DOS BÔNUS
  const [bonuses, setBonuses] = useState<any>({})

  // 🎲 ANIMAÇÃO
  const [rollingSkill, setRollingSkill] = useState<string | null>(null)

  const skills = [
    { attribute: "AGI", list: ["Acrobacia","Crime","Furtividade","Iniciativa","Pontaria","Reflexos"] },
    { attribute: "FOR", list: ["Atletismo","Luta"] },
    { attribute: "INT", list: ["Ciências","Investigação","Medicina","Ocultismo","Profissão","Tecnologia","Escutar","Percepção"] },
    { attribute: "PRE", list: ["Adestramento","Diplomacia","Enganação","Intimidação","Intuição","Vontade"] },
    { attribute: "VIG", list: ["Fortitude"] }
  ]

  // 🔥 CARREGAR DO BANCO
  useEffect(() => {
    if (!characterId) return
    loadSkills()
  }, [characterId])

  async function loadSkills() {
    const { data, error } = await supabase
      .from("skills")
      .select("*")
      .eq("character_id", characterId)

    if (error) {
      console.error("Erro ao carregar skills:", error)
      return
    }

    const loaded: any = {}

    data?.forEach((item: any) => {
      loaded[item.skill] = {
        bonus: item.bonus ?? 0,
        visible: item.visible ?? true
      }
    })

    setBonuses(loaded)
  }

  // 💾 SALVAR NO BANCO (AGORA COMPLETO)
  async function saveBonus(skill: string, data: any) {

    if (!characterId) return

    const { error } = await supabase
      .from("skills")
      .upsert([{
        character_id: characterId,
        skill,
        bonus: data.bonus ?? 0,
        visible: data.visible ?? true
      }], {
        onConflict: "character_id,skill"
      })

    if (error) {
      console.error("Erro ao salvar skill:", error)
    }
  }

  function handleBonusChange(skill: string, value: number) {

    const updated = {
      ...(bonuses[skill] || { visible: true }),
      bonus: value
    }

    const newBonuses = {
      ...bonuses,
      [skill]: updated
    }

    setBonuses(newBonuses)

    saveBonus(skill, updated)
  }

  function toggleVisibility(skill: string) {

    const current = bonuses[skill] || { bonus: 0, visible: true }

    const updated = {
      ...current,
      visible: !current.visible
    }

    const newBonuses = {
      ...bonuses,
      [skill]: updated
    }

    setBonuses(newBonuses)

    saveBonus(skill, updated)
  }

  function rollDice(skill: string) {

    const skillData = bonuses[skill] || { bonus: 0, visible: true }
    const bonus = skillData.bonus ?? 0

    const audio = new Audio("/dice.mp3")
    audio.play()

    setRollingSkill(skill)

    setTimeout(() => {

      const dice = Math.floor(Math.random() * 20) + 1
      const total = dice + bonus

      onRoll({
        formula: `1d20+${bonus}`,
        rolls: [dice],
        bonus,
        total
      })

      setRollingSkill(null)

    }, 500)
  }

  return (
  <div className="
    bg-gradient-to-b from-zinc-950/80 to-black/80 backdrop-blur-sm
  p-5
  rounded-2xl
  border-2 border-green-800
  shadow-[0_0_12px_rgba(51,100,50,0.5)]
  relative
  overflow-hidden
  ">

      <h2 className="
  text-[11px]
  tracking-[4px]
  uppercase
  text-green-500
  mb-4
  pb-2
  border-b border-red -500
  relative
">
  PERÍCIAS
</h2>

      {skills.map((group) => (
        <div key={group.attribute} className="mb-4">

          <h3 className="text-sm tracking-widest mb-2 text-zinc-500 border-l-4 border-green-900 pl-2">
            {group.attribute}
          </h3>

          {group.list.map((skill) => {

            const skillData = bonuses[skill] || { bonus: 0, visible: true }

            // 🔒 Se não for mestre e estiver invisível, não renderiza
            if (!skillData.visible && !isMaster) return null

            const bonus = skillData.bonus ?? 0
            const isRolling = rollingSkill === skill

            return (
              <div
  key={skill}
  className="
    flex justify-between items-center
    text-xs
    py-1 px-2
    border-b border-zinc-900
    hover:bg-green-900/50
    transition-all
    cursor-pointer
  "

              >

                {/* NOME */}
                <span className="text-sm w-32">{skill}</span>

                {/* INPUT BONUS */}
                <input
                  type="number"
                  value={bonus}
                  onChange={(e) => handleBonusChange(skill, Number(e.target.value))}
                  className="
  w-12
  bg-black
  border border-zinc-400
  text-center
  text-xs
  rounded-sm
  focus:outline-none
  focus:border-zinc-500
"
                />

                {/* BOTÃO VISIBILIDADE (SÓ MESTRE) */}
                {isMaster && (
                  <button
                    onClick={() => toggleVisibility(skill)}
                    className="text-xs text-yellow-400 hover:text-yellow-300"
                  >
                    {skillData.visible ? "👁️" : "🚫"}
                  </button>
                )}

                {/* DADO */}
                <button
                  onClick={() => rollDice(skill)}
                  className={`
  text-zinc-600 text-lg transition
  ${isRolling
    ? "animate-spin scale-125"
    : "hover:text-red-400 hover:scale-110"}
`}
                >
                  🎲
                </button>

              </div>
            )
          })}

        </div>
      ))}

    </div>
  )
}