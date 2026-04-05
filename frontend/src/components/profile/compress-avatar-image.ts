const MAX_START_DIMENSION = 2048

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Não foi possível carregar a imagem'))
    img.src = dataUrl
  })
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Falha ao ler arquivo'))
    }
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'))
    reader.readAsDataURL(file)
  })
}

/**
 * Redimensiona e exporta como JPEG até caber em maxBytes (ex.: limite de upload do avatar).
 */
export async function compressImageFileToMaxBytes(file: File, maxBytes: number): Promise<File> {
  const dataUrl = await readFileAsDataUrl(file)
  const image = await loadImageFromDataUrl(dataUrl)

  let scaleW = image.naturalWidth
  let scaleH = image.naturalHeight
  const longest = Math.max(scaleW, scaleH)
  if (longest > MAX_START_DIMENSION) {
    const ratio = MAX_START_DIMENSION / longest
    scaleW = Math.round(scaleW * ratio)
    scaleH = Math.round(scaleH * ratio)
  }

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Seu navegador não suporta compressão de imagem neste fluxo.')
  }

  const baseName = file.name.replace(/\.[^.]+$/i, '') || 'avatar'
  let quality = 0.9

  for (let round = 0; round < 22; round += 1) {
    canvas.width = scaleW
    canvas.height = scaleH
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, scaleW, scaleH)
    ctx.drawImage(image, 0, 0, scaleW, scaleH)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
    })
    if (!blob) {
      throw new Error('Falha ao comprimir a imagem.')
    }

    if (blob.size <= maxBytes) {
      return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
    }

    if (quality > 0.5) {
      quality -= 0.06
      continue
    }

    if (scaleW > 256 && scaleH > 256) {
      scaleW = Math.max(256, Math.round(scaleW * 0.82))
      scaleH = Math.max(256, Math.round(scaleH * 0.82))
      quality = 0.88
      continue
    }

    throw new Error(
      'Não foi possível deixar a imagem abaixo do limite de 5 MB. Tente outro arquivo ou uma foto com menos detalhes.',
    )
  }

  throw new Error('Não foi possível comprimir a imagem dentro do limite.')
}
