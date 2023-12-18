<template>
    <transition name="slide-fade" appear>
        <div>
            <h1 class="mb-3">
                {{ $t("Reports") }}
            </h1>
            <div class="shadow-box">
                <template v-if="$root.statusMonitorListLoaded">
                    <form class="my-4" autocomplete="off" @submit.prevent="generateReport">
                        <!-- Server Monitor -->
                        <div class="mb-4">
                            <label for="monitor" class="form-label">
                                {{ $t("Select Monitor") }}
                            </label>
                            <input v-model="searchTerm" class="form-control" placeholder="Search" @input="filterItems" />
                            <ul v-show="isOpen">
                                <li v-for="item in filteredItems" :key="item.id" @click="selectItem(item)">
                                    {{ item.name }}
                                </li>
                            </ul>
                        </div>
                        <div class="mb-4">
                            <div class="d-flex flex-row align-items-center">
                                <div class="col-6">
                                    <label class="form-label">{{ $t("From Date") }}</label>
                                    <datepicker
                                        v-model="report.startDate"
                                        :dark="$root.isDark"
                                        :monthChangeOnScroll="false"
                                        format="yyyy-MM-dd"
                                        @update:model-value="handleDateChange"
                                        modelType="yyyy-MM-dd 00:00:00"
                                    />
                                </div>
                                <div class="col-6">
                                    <label class="form-label">{{ $t("To Date") }}</label>
                                    <datepicker
                                        v-model="report.endDate"
                                        :dark="$root.isDark"
                                        :monthChangeOnScroll="false"
                                        :minDate="minEndDate"
                                        format="yyyy-MM-dd"
                                        modelType="yyyy-MM-dd 23:59:59"
                                    />
                                </div>
                            </div>
                        </div>
                        <div class="mb-4">
                            <div>
                                <button class="btn btn-primary" :disabled="processing" type="submit">
                                    {{ $t("Export") }}
                                </button>
                            </div>
                        </div>
                    </form>
                </template>
                <div v-else class="d-flex align-items-center justify-content-center my-3 spinner">
                    <font-awesome-icon icon="spinner" size="2x" spin />
                </div>
            </div>
        </div>
    </transition>
</template>

<script>

import { getResBaseURL } from "../util-frontend";
import { useToast } from "vue-toastification";
import Datepicker from "@vuepic/vue-datepicker";
const toast = useToast();
import moment from "moment";

export default {
    components: {
        Datepicker
    },
    data() {
        return {
            report: {
                monitor: "",
                startDate: "",
                endDate: ""
            },
            minEndDate: "",
            processing: false,
            selectedDate: null,
            fetchedData: null,
            searchTerm: '',
            filteredItems: [],
            isOpen: false
        };
    },
    computed: {
        sortedMonitorList() {
            let result = Object.values(this.$root.monitorList);
            // Filter result by active state, weight and alphabetical
            result.sort((m1, m2) => {
                if (m1.active !== m2.active) {
                    if (m1.active === false) {
                        return 1;
                    }

                    if (m2.active === false) {
                        return -1;
                    }
                }

                if (m1.weight !== m2.weight) {
                    if (m1.weight > m2.weight) {
                        return -1;
                    }

                    if (m1.weight < m2.weight) {
                        return 1;
                    }
                }

                return m1.name.localeCompare(m2.name);
            });
            this.filteredItems = result;
            return result;
        },
        timePeriod() {
            let startDays = 7;
            let endDays = 30;
            let days = [];
            for (startDays; startDays < endDays; startDays++) {
                days.push(startDays);
            }
            return days;
        }
    },
    mounted() {
    },
    methods: {
        
        handleSelectChange() {
            // Reset search term when an item is selected
            this.searchTerm = '';
        },
        filterItems() {
            this.isOpen = true;
            this.filteredItems = this.sortedMonitorList.filter(item =>
                item.name.toLowerCase().includes(this.searchTerm.toLowerCase())
            );
        },
        selectItem(monitor) {
            this.report.monitor = monitor.name;
            this.searchTerm = monitor.name;
            this.isOpen = false;
        },
        init() {
            this.report = {
                monitor: "",
                startDate: "",
                endDate: ""
            };
        },

        async generateReport() {
            this.processing = true;
            if (this.report.monitor === "") {
                toast.error("Please select monitor");
                return this.processing = false;
            }
            let message = "";
            if (this.report.startDate !== "" && (this.report.startDate && this.report.startDate.length !== 0)) {
                if (this.report.endDate === "" || this.report.endDate === null) {
                    message = "Please select end date";
                }
            }
            if (this.report.endDate !== "" && (this.report.endDate && this.report.endDate.length !== 0)) {
                if (this.report.startDate === "" || this.report.startDate === null) {
                    message = "Please select start date";
                }
            }

            if(message.length === 0 && this.report.endDate && this.report.startDate) {
                if (!moment(this.report.startDate).isSame(this.report.endDate) || (moment(this.report.startDate).isSame(moment().format("YYYY-MM-DD")))) {
                    if (!moment(this.report.startDate).isBefore(moment(this.report.endDate))) {
                        message = "Please select valid end date";
                    }
                }
                if (moment(this.report.endDate, "YYYY-MM-DD").isAfter(moment())) {
                    message = "Please select valid end date";
                }
            }

            if (message.length > 0) {
                toast.error(message);
                return this.processing = false;
            }
            this.$root.generateReports(this.report, async (res) => {
                if (res.ok) {
                    this.processing = false;
                    const fileUrl = res.data.filePath;
                    const fileName = res.data.fileName;
                    const link = document.createElement("a");
                    link.href = fileUrl;
                    link.download = res.data.fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setTimeout(() => {
                        this.unlinkReport(fileName);
                    }, 1000);
                } else {
                    toast.error(res.msg);
                    this.processing = false;
                }
            });
        },

        async unlinkReport(fileName) {
            this.$root.unlinkReport(fileName, async (res) => {
                return true;
            });
        },
        /**
         * Get the correct URL for the icon
         * @param {string} icon Path for icon
         * @returns {string} Correctly formatted path including port numbers
         */
        icon(icon) {
            if (icon === "/icon.svg") {
                return icon;
            } else {
                return getResBaseURL() + icon;
            }
        },

        handleDateChange(date) {
            this.minEndDate = date;
        },
    },
};
</script>

<style lang="scss" scoped>
    @import "../assets/vars.scss";

    .item {
        display: flex;
        align-items: center;
        gap: 10px;
        text-decoration: none;
        border-radius: 10px;
        transition: all ease-in-out 0.15s;
        padding: 10px;

        &:hover {
            background-color: $highlight-white;
        }

        &.active {
            background-color: #cdf8f4;
        }

        $logo-width: 70px;

        .logo {
            width: $logo-width;
            height: $logo-width;

            // Better when the image is loading
            min-height: 1px;
        }

        .info {
            .title {
                font-weight: bold;
                font-size: 20px;
            }

            .slug {
                font-size: 14px;
            }
        }
    }

    .dark {
        .item {
            &:hover {
                background-color: $dark-bg2;
            }

            &.active {
                background-color: $dark-bg2;
            }
        }
    }

    .weekday-picker {
        display: flex;
        gap: 10px;

        & > div {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 40px;

            .form-check-inline {
                margin-right: 0;
            }
        }
    }

    .day-picker {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;

        & > div {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 40px;

            .form-check-inline {
                margin-right: 0;
            }
        }
    }
    .monitor_list {
        position: absolute;
        background-color: #fff;
        margin-left: 103px;
        width: 63%;
    }
    .monitor_list li {
        padding: 5px;
    }
    .monitor_list li:hover {
        background-color: #5cdd8b;
    }
    .dropdown {
            position: relative;
            display: inline-block;
        }

        input {
            padding: 8px;
            font-size: 16px;
        }

        ul {
            list-style: none;
            padding: 0;
            margin: 0;
            position: absolute;
            width: 62%;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            background-color: #fff;
            border: 1px solid #ccc;
            max-height: 150px;
            overflow-y: auto;
            z-index: 1;
        }

        ul li {
            padding: 8px;
            cursor: pointer;
        }

        ul li:hover {
            background-color: #f0f0f0;
        }
</style>
