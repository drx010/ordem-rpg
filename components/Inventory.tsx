"use client"

export default function Inventory(){

return(

<div className="bg-neutral-900 p-4 rounded-xl">

<h2>Inventário</h2>

<div className="grid grid-cols-5 gap-2 mt-2">

{Array.from({length:10}).map((_,i)=>(
<div
key={i}
className="bg-black h-16 rounded border border-neutral-700"
/>
))}

</div>

</div>

)
}