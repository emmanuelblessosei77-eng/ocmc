import Swal from 'sweetalert2'

const palette = {
  navy: '#0A1931',
  gold: '#D4AF5A',
}

function toast(icon: 'success' | 'error' | 'warning' | 'info', title: string) {
  return Swal.fire({
    toast: true,
    position: 'top-end',
    icon,
    title,
    showConfirmButton: false,
    timer: 3600,
    timerProgressBar: true,
    iconColor: icon === 'success' ? '#176b45' : icon === 'warning' ? '#9a6700' : undefined,
    confirmButtonColor: palette.navy,
    background: '#ffffff',
    color: palette.navy,
  })
}

export function notifySuccess(title: string) {
  return toast('success', title)
}

export function notifyError(title: string, message?: string) {
  return Swal.fire({
    icon: 'error',
    title,
    ...(message ? { text: message } : {}),
    confirmButtonText: 'Dismiss',
    confirmButtonColor: palette.navy,
    background: '#ffffff',
    color: palette.navy,
  })
}

export function notifyWarning(title: string, message?: string) {
  return Swal.fire({
    icon: 'warning',
    title,
    ...(message ? { text: message } : {}),
    confirmButtonText: 'Understood',
    confirmButtonColor: palette.navy,
    background: '#ffffff',
    color: palette.navy,
  })
}

export async function confirmAction(title: string, message: string, confirmText: string): Promise<boolean> {
  const result = await Swal.fire({
    icon: 'warning',
    title,
    text: message,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: 'Cancel',
    confirmButtonColor: palette.navy,
    cancelButtonColor: '#64748b',
    reverseButtons: true,
    focusCancel: true,
    background: '#ffffff',
    color: palette.navy,
  })
  return result.isConfirmed
}
