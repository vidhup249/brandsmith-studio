import {
    t2iModels, getAspectRatiosForModel, getResolutionsForModel, getQualityFieldForModel,
    i2iModels, getAspectRatiosForI2IModel, getResolutionsForI2IModel, getQualityFieldForI2IModel,
    getMaxImagesForI2IModel,
} from './models.js';

export { t2iModels, i2iModels };

// Generators whose edit model doesn't follow the usual naming patterns.
const EDIT_ALIASES = {
    'bytedance-seedream-v4': 'bytedance-seedream-edit-v4',
    'wan2.5-text-to-image': 'wan2.5-image-edit',
    'wan2.6-text-to-image': 'wan2.6-image-edit',
    'reve-text-to-image': 'reve-image-edit',
    'kling-o1-text-to-image': 'kling-o1-edit-image',
};
const DEFAULT_EDIT_MODEL = 'nano-banana-2-edit';

// Edit counterpart of a generator (nano-banana → nano-banana-edit, *-t2i → *-i2i, ...),
// falling back to a general-purpose editor.
export function editModelFor(id) {
    const candidates = [
        EDIT_ALIASES[id],
        `${id}-edit`,
        id.replace(/-t2i$/, '-i2i'),
        id.replace('text-to-image', 'image-to-image'),
        `${id}-i2i`,
        id,
        DEFAULT_EDIT_MODEL,
    ];
    return candidates.map(c => i2iModels.find(m => m.id === c)).find(Boolean) || i2iModels[0];
}

export const isEditModelId = (id) => i2iModels.some(m => m.id === id);
export const findImageModel = (id) => i2iModels.find(m => m.id === id) || t2iModels.find(m => m.id === id);

// Option helpers. `edit` says which variant to read: a few ids exist in both lists,
// so callers pass whether a reference image is attached.
export function aspectRatiosFor(id, edit) {
    const list = edit ? getAspectRatiosForI2IModel(id) : getAspectRatiosForModel(id);
    return list?.length ? list : ['1:1'];
}
export const resolutionsFor = (id, edit) => (edit ? getResolutionsForI2IModel(id) : getResolutionsForModel(id)) || [];
export const qualityFieldFor = (id, edit) => (edit ? getQualityFieldForI2IModel(id) : getQualityFieldForModel(id));
// How many reference images a model takes (generators use their edit model's limit).
export const maxImagesFor = (id, edit) => getMaxImagesForI2IModel(edit ? id : editModelFor(id).id);
