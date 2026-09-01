const form = document.querySelector('#report-form');
const imageInput = document.querySelector('#image');
const uploadZone = document.querySelector('#upload-zone');
const previewWrap = document.querySelector('#preview-wrap');
const preview = document.querySelector('#preview');
const removeImage = document.querySelector('#remove-image');
const feedback = document.querySelector('#feedback');
const submitButton = form.querySelector('.submit-button');

function showFeedback(message, type) {
  feedback.textContent = message;
  feedback.className = `feedback ${type}`;
}

function showPreview(file) {
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
    imageInput.value = '';
    showFeedback('Choose a JPG, PNG, or WebP image smaller than 8 MB.', 'error');
    return;
  }
  preview.src = URL.createObjectURL(file);
  previewWrap.classList.remove('hidden');
  feedback.className = 'feedback hidden';
}

imageInput.addEventListener('change', () => showPreview(imageInput.files[0]));
['dragenter', 'dragover'].forEach((eventName) => uploadZone.addEventListener(eventName, (event) => {
  event.preventDefault();
  uploadZone.style.background = '#e8f2e5';
}));
['dragleave', 'drop'].forEach((eventName) => uploadZone.addEventListener(eventName, (event) => {
  event.preventDefault();
  uploadZone.style.background = '';
}));
uploadZone.addEventListener('drop', (event) => {
  const [file] = event.dataTransfer.files;
  if (file) {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    imageInput.files = transfer.files;
    showPreview(file);
  }
});
removeImage.addEventListener('click', (event) => {
  event.preventDefault();
  imageInput.value = '';
  previewWrap.classList.add('hidden');
  preview.removeAttribute('src');
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  submitButton.disabled = true;
  submitButton.querySelector('span').textContent = 'Sending alert...';
  feedback.className = 'feedback hidden';

  try {
    const response = await fetch('/api/reports', { method: 'POST', body: new FormData(form) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Unable to send report.');
    showFeedback(`Alert ${result.report.id} sent. Rescue teams have been notified.`, 'success');
    form.reset();
    previewWrap.classList.add('hidden');
  } catch (error) {
    showFeedback(error.message, 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector('span').textContent = 'Send rescue alert';
  }
});
