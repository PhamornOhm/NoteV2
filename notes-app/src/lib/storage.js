import { supabase } from './supabase'

export const uploadFile = async (file, userId) => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random()}.${fileExt}`
  const filePath = `${userId}/${fileName}`

  const { error: uploadError, data } = await supabase.storage
    .from('notes-attachments')
    .upload(filePath, file)

  if (uploadError) {
    if (uploadError.message === 'Bucket not found') {
      throw new Error('ยังไม่ได้สร้าง Bucket "notes-attachments" ใน Supabase Storage โปรดสร้าง Bucket นี้และตั้งค่าเป็น Public ก่อนใช้งาน')
    }
    throw uploadError
  }

  const { data: { publicUrl } } = supabase.storage
    .from('notes-attachments')
    .getPublicUrl(filePath)

  return {
    name: file.name,
    size: file.size,
    type: file.type,
    url: publicUrl,
    path: filePath
  }
}

export const deleteFile = async (path) => {
  const { error } = await supabase.storage
    .from('notes-attachments')
    .remove([path])
  
  if (error) throw error
}
