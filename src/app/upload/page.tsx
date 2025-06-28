import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

export default async function UploadPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Upload Your Receipts</h1>
          <p className="mt-2 text-lg text-gray-600">AI-powered OCR will scan and calculate your carbon footprint</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="mt-4">
              <label htmlFor="file-upload" className="cursor-pointer">
                <span className="mt-2 block text-sm font-medium text-gray-900">
                  Drop your receipt images here, or click to browse
                </span>
                <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept="image/*" />
              </label>
              <p className="mt-2 text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              🌱 Our AI will analyze your receipts and calculate the carbon footprint of your purchases
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
